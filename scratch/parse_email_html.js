const fs = require('fs');
const path = require('path');

(async () => {
  const emailHtmlPath = path.join(__dirname, '..', 'logs', 'flm-agent-email-today.html');
  try {
    const content = fs.readFileSync(emailHtmlPath, 'utf8');
    const lines = content.split(/\r?\n/);
    console.log(`HTML File size: ${content.length} bytes`);
    
    console.log('--- SCANNING HTML FOR CAMPAIGNS ---');
    lines.forEach((line, index) => {
      const lower = line.toLowerCase();
      if (lower.includes('original') || lower.includes('aftr') || lower.includes('exposed') || lower.includes('shielded')) {
        console.log(`[Line ${index + 1}] ${line.trim()}`);
      }
    });
  } catch (err) {
    console.error('Error:', err.message);
  }
})();
