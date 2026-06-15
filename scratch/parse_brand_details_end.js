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
    
    console.log('--- END OF original ---');
    let foundOriginal = -1;
    lines.forEach((line, index) => {
      if (line.includes('COMPLETED: original')) {
        foundOriginal = index;
      }
    });
    if (foundOriginal !== -1) {
      for (let i = foundOriginal - 15; i <= foundOriginal + 5; i++) {
        console.log(`[Line ${i + 1}] ${lines[i]}`);
      }
    }

    console.log('\n--- END OF aftr-main ---');
    let foundAftr = -1;
    lines.forEach((line, index) => {
      if (line.includes('COMPLETED: 1803') || line.includes('COMPLETED: aftr-main')) {
        foundAftr = index;
      }
    });
    // Let's also look for general America's First Tax Relief complete markers
    lines.forEach((line, index) => {
      if (line.includes('COMPLETED:') && line.toLowerCase().includes('aftr')) {
        foundAftr = index;
      }
    });
    if (foundAftr !== -1) {
      for (let i = foundAftr - 15; i <= foundAftr + 5; i++) {
        console.log(`[Line ${i + 1}] ${lines[i]}`);
      }
    }
  } catch (err) {
    console.error('Error:', err.message);
  }
})();
