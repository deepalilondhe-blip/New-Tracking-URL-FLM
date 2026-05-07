const { exec } = require('child_process');
const path = require('path');
const fs = require('fs');
require('dotenv').config();

// Configuration: List of all active campaign runners in sequence
const runnerScripts = [
  // 1. FTD-X
  'run-ftd-x.js',
  'run-ftd-x-mobile.js',
  'run-ftd-x-tablet.js',

  // 2. FSI-PPC2
  'run-fsi-ppc2.js',
  'run-fsi-ppc2-mobile.js',
  'run-fsi-ppc2-tablet.js',

  // 3. Guardian Tax Relief
  'run-guardian-tr.js',
  'run-guardian-tr-mobile.js',
  'run-guardian-tr-tablet.js',

  // 4. TRA-CPL
  'run-tra-cpl.js',
  'run-tra-cpl-mobile.js',
  'run-tra-cpl-tablet.js',

  // 5. TRA-D3 (TRA-DT3)
  'run-tra-d3.js',
  'run-tra-d3-mobile.js',
  'run-tra-d3-tablet.js',

  // 6. PPC-ST
  'run-ppc-st.js',
  'run-ppc-st-mobile.js',
  'run-ppc-st-tablet.js',

  // 7. PPC-ST2
  'run-ppc-st2.js',
  'run-ppc-st2-mobile.js',
  'run-ppc-st2-tablet.js',

  // 8. PPC-M/CA
  'run-ppc-m-ca.js',
  'run-ppc-m-ca-mobile.js',
  'run-ppc-m-ca-tablet.js',

  // 9. PPC-CR
  'run-ppc-cr.js',
  'run-ppc-cr-mobile.js',
  'run-ppc-cr-tablet.js',

  // 10. PPC-FS
  'run-ppc-fs.js',
  'run-ppc-fs-mobile.js',
  'run-ppc-fs-tablet.js',

  // 11. PPC (Desktop)
  'run-ppc.js',

  // 12. TRA-CPM (Desktop)
  'run-tra-cpm.js'
];

// Load Interval from environment variables (default to 2 hours)
const intervalHours = parseFloat(process.env.SCHEDULER_INTERVAL_HOURS) || 2.0;
const intervalMs = intervalHours * 60 * 60 * 1000;

function formatTimestamp() {
  return new Date().toLocaleString();
}

/**
 * Execute a single runner file as a promise
 */
function runScript(scriptFile) {
  return new Promise((resolve) => {
    const scriptPath = path.join(__dirname, scriptFile);
    if (!fs.existsSync(scriptPath)) {
      console.warn(`⚠️  Runner file not found: ${scriptFile}. Skipping.`);
      return resolve({ scriptFile, success: false, error: 'File not found' });
    }

    console.log(`\n================================================================`);
    console.log(`🚀 [${formatTimestamp()}] RUNNING: ${scriptFile}`);
    console.log(`================================================================`);

    const child = exec(`node "${scriptFile}"`, { cwd: __dirname }, (error, stdout, stderr) => {
      if (error) {
        console.error(`❌ [${formatTimestamp()}] FAILED: ${scriptFile}`);
        console.error(`Error: ${error.message}`);
        return resolve({ scriptFile, success: false, error: error.message });
      }
      
      console.log(`✅ [${formatTimestamp()}] COMPLETED: ${scriptFile}`);
      return resolve({ scriptFile, success: true });
    });

    // Pipe stdout and stderr to scheduler terminal in real-time
    child.stdout.on('data', (data) => {
      process.stdout.write(`[${scriptFile}] ${data}`);
    });

    child.stderr.on('data', (data) => {
      process.stderr.write(`[${scriptFile}] [STDERR] ${data}`);
    });
  });
}

/**
 * Main batch execution loop
 */
async function runBatch() {
  console.log(`\n🤖 ================================================================`);
  console.log(`🤖 STARTING LEADS AUTOMATION BATCH RUN [${formatTimestamp()}]`);
  console.log(`🤖 Interval configured: every ${intervalHours} hours`);
  console.log(`🤖 ================================================================`);

  const startTime = Date.now();
  const results = [];

  for (const script of runnerScripts) {
    const result = await runScript(script);
    results.push(result);
    // 3-second breathing room between campaigns to let OS clean port sockets
    await new Promise(resolve => setTimeout(resolve, 3000));
  }

  const durationMinutes = ((Date.now() - startTime) / (1000 * 60)).toFixed(2);
  const total = results.length;
  const succeeded = results.filter(r => r.success).length;
  const failed = total - succeeded;

  console.log(`\n📊 ================================================================`);
  console.log(`📊 BATCH COMPLETED IN ${durationMinutes} MINUTES`);
  console.log(`📊 Total Runners Executed: ${total}`);
  console.log(`📊 Succeeded:              ${succeeded}`);
  console.log(`📊 Failed:                 ${failed}`);
  console.log(`📊 ================================================================`);

  if (failed > 0) {
    console.log('❌ Failed scripts summary:');
    results.forEach(r => {
      if (!r.success) {
        console.log(`   - ${r.scriptFile}: ${r.error}`);
      }
    });
  }

  console.log(`\n⏳ Next automation batch will start at: ${new Date(Date.now() + intervalMs).toLocaleString()}`);
}

// Start immediately on launch
runBatch();

// Schedule recurrences
setInterval(runBatch, intervalMs);
