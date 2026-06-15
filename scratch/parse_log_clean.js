const fs = require('fs');
const path = require('path');

(async () => {
  const logPath = path.join(__dirname, '..', 'logs', 'scheduler', 'scheduler_run_20261506_110000.log');
  try {
    const raw = fs.readFileSync(logPath);
    // Strip null bytes to normalize mixed ANSI/UTF-16 output
    const cleanBytes = [];
    for (let i = 0; i < raw.length; i++) {
      if (raw[i] !== 0x00) {
        cleanBytes.push(raw[i]);
      }
    }
    const cleanContent = Buffer.from(cleanBytes).toString('utf8');
    const lines = cleanContent.split(/\r?\n/);
    console.log(`Total normalized lines: ${lines.length}`);
    
    console.log('\n--- ALL ERROR / FAILURE MESSAGES ---');
    let count = 0;
    lines.forEach((line, index) => {
      const lower = line.toLowerCase();
      // Look for error, fail, timeout, exception, blocked, or missing
      if (lower.includes('fail') || lower.includes('error') || lower.includes('timeout') || lower.includes('block') || lower.includes('mismatch') || lower.includes('lead id')) {
        console.log(`[Line ${index + 1}] ${line.trim()}`);
        count++;
      }
    });
    console.log(`\nFound ${count} lines.`);
  } catch (err) {
    console.error('Error:', err.message);
  }
})();
