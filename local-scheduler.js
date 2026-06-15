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
  if (!shouldRunToday()) {
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
  const nextRun = new Date();
  nextRun.setHours(11, 30, 0, 0);

  // If 11:30 AM has already passed today, set for tomorrow at 11:30 AM
  if (now >= nextRun) {
    nextRun.setDate(nextRun.getDate() + 1);
  }

  const delay = nextRun.getTime() - now.getTime();
  console.log(`⏳ Next automated batch is scheduled to run at: ${nextRun.toLocaleString()}`);
  console.log(`⏳ Waiting for ${Math.round(delay / 1000 / 60)} minutes...`);

  setTimeout(runPlaywrightTests, delay);
}

// Start scheduling
scheduleNextRun();
