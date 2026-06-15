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
    
    console.log('--- HEALTH CHECK FAILURES OR DOWN STATUS ---');
    lines.forEach((line, index) => {
      const lower = line.toLowerCase();
      if (lower.includes('is down') || lower.includes('health') || lower.includes('vpn') || lower.includes('ping failed')) {
        console.log(`[Line ${index + 1}] ${line.trim()}`);
      }
    });
  } catch (err) {
    console.error('Error:', err.message);
  }
})();
