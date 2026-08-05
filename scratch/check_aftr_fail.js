const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, '..', 'traces', 'FAILURE_aftr-main_desktop.png');
if (fs.existsSync(filePath)) {
  const stats = fs.statSync(filePath);
  console.log('File size:', stats.size);
  console.log('Last modified:', stats.mtime);
  
  const diffMinutes = (new Date() - stats.mtime) / (1000 * 60);
  console.log(`Modified ${diffMinutes.toFixed(2)} minutes ago.`);
} else {
  console.log('File not found.');
}
