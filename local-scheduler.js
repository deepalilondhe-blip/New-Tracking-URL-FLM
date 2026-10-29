const { exec } = require('child_process');
const path = require('path');
const fs = require('fs');

// Days on which the scheduler is allowed to run: Monday=1, Wednesday=3, Friday=5
const ALLOWED_DAYS = new Set([1, 3, 5]);

// Target time in 24-hour format (11:00 AM IST)
const TARGET_HOUR = 11;
const TARGET_MINUTE = 0;

const LOCK_FILE = path.join(__dirname, '.local-scheduler.lock');

/**
 * Acquire process lock to prevent concurrent executions
 */
function acquireLock() {
  if (fs.existsSync(LOCK_FILE)) {
    try {
      const pid = fs.readFileSync(LOCK_FILE, 'utf8').trim();
      if (pid && isProcessRunning(pid)) {
        console.warn(`⚠️ [Lock] Another scheduler instance is already running (PID: ${pid}). Skipping execution to prevent overlap.`);
        return false;
      }
    } catch (e) {
      // Stale lock file, continue
    }
  }
  try {
    fs.writeFileSync(LOCK_FILE, String(process.pid), 'utf8');
    return true;
  } catch (err) {
    console.error('⚠️ Could not write lock file:', err.message);
    return true;
  }
}

/**
 * Release process lock upon completion
 */
function releaseLock() {
  try {
    if (fs.existsSync(LOCK_FILE)) {
      fs.unlinkSync(LOCK_FILE);
    }
  } catch (err) {}
}

function isProcessRunning(pid) {
  try {
    return process.kill(Number(pid), 0);
  } catch (e) {
    return false;
  }
}

// Clean up lock file on exit or termination signals
process.on('exit', releaseLock);
process.on('SIGINT', () => { releaseLock(); process.exit(0); });
process.on('SIGTERM', () => { releaseLock(); process.exit(0); });

function shouldRunToday() {
  const today = new Date();
  // getDay(): 0=Sunday, 1=Monday, ...
  return ALLOWED_DAYS.has(today.getDay());
}

/**
 * Calculate the next scheduled date and time
 */
function getNextRunTime() {
  const now = new Date();
  const next = new Date(now);
  next.setHours(TARGET_HOUR, TARGET_MINUTE, 0, 0);

  if (next <= now) {
    next.setDate(next.getDate() + 1);
  }

  while (!ALLOWED_DAYS.has(next.getDay())) {
    next.setDate(next.getDate() + 1);
  }

  return next;
}

/**
 * Executes a single batch run using the unchanged scheduler.js
 */
function runPlaywrightTests() {
  return new Promise((resolve) => {
    if (!shouldRunToday() && !process.argv.includes('--force') && !process.argv.includes('--now')) {
      console.log(`\n⏰ [${new Date().toLocaleString()}] Skipping campaign run: today is not Mon/Wed/Fri.`);
      return resolve(false);
    }

    if (!acquireLock()) {
      return resolve(false);
    }

    console.log(`\n⏰ [${new Date().toLocaleString()}] Starting Playwright campaign automation batch run...`);

    const schedulerScript = path.join(__dirname, 'scheduler.js');
    const extraArgs = [];

    if (process.argv.includes('--headed')) extraArgs.push('--headed');
    if (process.argv.includes('--headless')) extraArgs.push('--headless');

    const campaignsArgIdx = process.argv.indexOf('--campaigns');
    if (campaignsArgIdx !== -1 && process.argv[campaignsArgIdx + 1]) {
      extraArgs.push(`--campaigns "${process.argv[campaignsArgIdx + 1]}"`);
    }

    const command = `node "${schedulerScript}" --once ${extraArgs.join(' ')}`.trim();
    const child = exec(command, { cwd: __dirname });

    child.stdout.on('data', data => process.stdout.write(data));
    child.stderr.on('data', data => process.stderr.write(data));

    child.on('close', code => {
      releaseLock();
      console.log(`\n================================================================`);
      if (code === 0) {
        console.log(`✅ [${new Date().toLocaleString()}] Batch run finished successfully!`);
      } else {
        console.log(`❌ [${new Date().toLocaleString()}] Batch run completed with some errors (Exit Code: ${code})`);
      }
      console.log(`================================================================\n`);
      resolve(code === 0);
    });
  });
}

/**
 * Permanent background daemon loop
 */
async function startDaemon() {
  let isRunning = false;
  let lastRunDateKey = '';

  console.log(`\n🕒 ================================================================`);
  console.log(`🕒 LOCAL SCHEDULER PERMANENT DAEMON STARTED [PID: ${process.pid}]`);
  console.log(`🕒 Schedule: Every Monday, Wednesday, Friday at ${String(TARGET_HOUR).padStart(2, '0')}:${String(TARGET_MINUTE).padStart(2, '0')} IST`);
  console.log(`🕒 Next scheduled run: ${getNextRunTime().toLocaleString()}`);
  console.log(`🕒 Press Ctrl+C at any time to stop.`);
  console.log(`🕒 ================================================================\n`);

  setInterval(async () => {
    if (isRunning) return;

    const now = new Date();
    const day = now.getDay();
    const hours = now.getHours();
    const minutes = now.getMinutes();
    const dateKey = `${now.getFullYear()}-${now.getMonth() + 1}-${now.getDate()}`;

    if (ALLOWED_DAYS.has(day) && hours === TARGET_HOUR && minutes === TARGET_MINUTE && lastRunDateKey !== dateKey) {
      isRunning = true;
      lastRunDateKey = dateKey;
      console.log(`\n⏰ [${now.toLocaleString()}] Triggering scheduled execution for ${dateKey}...`);
      await runPlaywrightTests();
      isRunning = false;
      console.log(`🕒 Next scheduled run: ${getNextRunTime().toLocaleString()}`);
    }
  }, 30000); // Check every 30 seconds
}

// Entry point
(async () => {
  const isDaemon = process.argv.includes('--daemon');
  const isNow = process.argv.includes('--now');

  if (isDaemon) {
    if (isNow) {
      console.log(`🚀 [Local Scheduler] Running immediate batch run first before starting daemon...`);
      await runPlaywrightTests();
    }
    await startDaemon();
  } else {
    // Run one batch (default for cron or manual execution)
    await runPlaywrightTests();
  }
})();
