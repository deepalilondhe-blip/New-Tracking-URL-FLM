const { exec } = require('child_process');
const path = require('path');

// Days on which the scheduler is allowed to run (Monday=1, Wednesday=3, Friday=5)
const ALLOWED_DAYS = new Set([1, 3, 5]);

function shouldRunToday() {
  const today = new Date();
  // getDay(): 0=Sunday, 1=Monday, ...
  return ALLOWED_DAYS.has(today.getDay());
}

function runPlaywrightTests() {
  if (!shouldRunToday() && !process.argv.includes('--force')) {
    console.log(`\n⏰ [${new Date().toLocaleString()}] Skipping campaign run: today is not Mon/Wed/Fri.`);
    scheduleNextRun();
    return;
  }
  console.log(`\n⏰ [${new Date().toLocaleString()}] Starting Playwright campaign automation batch run...`);

  const schedulerScript = path.join(__dirname, 'scheduler.js');
  const headedFlag = process.argv.includes('--headed') ? ' --headed' : '';
  const child = exec(`node "${schedulerScript}" --once${headedFlag}`, { cwd: __dirname });

  child.stdout.on('data', data => process.stdout.write(data));
  child.stderr.on('data', data => process.stderr.write(data));

  child.on('close', code => {
    console.log(`\n================================================================`);
    if (code === 0) {
      console.log(`✅ [${new Date().toLocaleString()}] Batch run finished successfully!`);
    } else {
      console.log(`❌ [${new Date().toLocaleString()}] Batch run completed with some errors (Exit Code: ${code})`);
    }
    console.log(`================================================================`);
    scheduleNextRun();
  });
}

function scheduleNextRun() {
  const now = new Date();
  const candidates = [];

  // Run 1: 11:30 AM today
  const run1 = new Date(now);
  run1.setHours(11, 30, 0, 0);

  // Run 2: 5:30 PM today
  const run2 = new Date(now);
  run2.setHours(17, 30, 0, 0);

  if (run1 > now) candidates.push(run1);
  if (run2 > now) candidates.push(run2);

  let nextRun;
  if (candidates.length > 0) {
    nextRun = candidates[0];
  } else {
    // Both runs for today have passed, schedule for tomorrow 11:30 AM
    nextRun = new Date(now);
    nextRun.setDate(now.getDate() + 1);
    nextRun.setHours(11, 30, 0, 0);
  }

  const delay = nextRun.getTime() - now.getTime();
  console.log(`⏳ Next automated batch is scheduled to run at: ${nextRun.toLocaleString()}`);
  console.log(`⏳ Waiting for ${Math.round(delay / 1000 / 60)} minutes...`);

  setTimeout(runPlaywrightTests, delay);
}

// Start scheduling
scheduleNextRun();
