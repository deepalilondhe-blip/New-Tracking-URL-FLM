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
    console.log(`⏳ Next automated batch will run in 2 hours...`);
  });
}

// Run every 2 hours (2 * 60 * 60 * 1000 milliseconds)
const INTERVAL_MS = 2 * 60 * 60 * 1000;
setInterval(runPlaywrightTests, INTERVAL_MS);

// Run immediately upon start if today is allowed
runPlaywrightTests();
