const { exec } = require('child_process');
const path = require('path');

// This task runs your 13 campaigns sequentially
function runPlaywrightTests() {
  console.log(`\n⏰ [${new Date().toLocaleString()}] Starting Playwright campaign automation batch run...`);

  // Run the core scheduler script once
  const schedulerScript = path.join(__dirname, 'scheduler.js');
  const child = exec(`node "${schedulerScript}" --once`, { cwd: __dirname });

  child.stdout.on('data', (data) => {
    process.stdout.write(data);
  });

  child.stderr.on('data', (data) => {
    process.stderr.write(data);
  });

  child.on('close', (code) => {
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

// Example: Run every 2 hours (2 * 60 * 60 * 1000 milliseconds)
const INTERVAL_MS = 2 * 60 * 60 * 1000;
setInterval(runPlaywrightTests, INTERVAL_MS);

// Run once immediately upon starting
runPlaywrightTests();
