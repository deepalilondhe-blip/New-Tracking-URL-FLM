const fs = require('fs');
const path = require('path');

(async () => {
  const logPath = path.join(__dirname, '..', 'logs', 'scheduler', 'scheduler_run_20261506_110000.log');
  try {
    const content = fs.readFileSync(logPath, 'utf8');
    const lines = content.split(/\r?\n/);
    console.log(`Total lines: ${lines.length}`);
    
    console.log('\n--- LAST 50 LINES ---');
    const lastLines = lines.slice(-50);
    lastLines.forEach((line, index) => {
      console.log(`${lines.length - 50 + index + 1}: ${line}`);
    });
  } catch (err) {
    console.error('Error:', err.message);
  }
})();
