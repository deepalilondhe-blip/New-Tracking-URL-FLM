const fs = require('fs');
const path = require('path');

(async () => {
  const logPath = path.join(__dirname, '..', 'logs', 'scheduler', 'scheduler_run_20261506_110000.log');
  try {
    const raw = fs.readFileSync(logPath);
    const cleanBytes = [];
    for (let i = 0; i < raw.length; i++) {
      if (raw[i] !== 0x00) {
        cleanBytes.push(raw[i]);
      }
    }
    const content = Buffer.from(cleanBytes).toString('utf8');
    const lines = content.split(/\r?\n/);
    
    console.log('--- DETAILS FOR aftr-main & original ---');
    let printing = false;
    let printedLines = 0;
    
    lines.forEach((line, index) => {
      const lower = line.toLowerCase();
      if (lower.includes('running: america\'s first tax relief (aftr)') || lower.includes('running: original')) {
        printing = true;
        printedLines = 0;
      }
      
      if (printing) {
        console.log(`[Line ${index + 1}] ${line}`);
        printedLines++;
        // Stop printing after 40 lines of that block
        if (printedLines > 40) {
          printing = false;
        }
      }
    });
  } catch (err) {
    console.error('Error:', err.message);
  }
})();
