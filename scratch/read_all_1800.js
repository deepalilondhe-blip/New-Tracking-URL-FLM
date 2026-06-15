const fs = require('fs');
const path = require('path');

const logPath = 'C:\\Users\\Deepali_Londhe\\.gemini\\antigravity\\brain\\6f01cb3d-4e70-4a1d-8884-d2a7a74a3258\\.system_generated\\tasks\\task-4122.log';
if (!fs.existsSync(logPath)) {
  console.error('Log file not found');
  process.exit(1);
}

const content = fs.readFileSync(logPath, 'utf8');
const lines = content.split('\n');

console.log('=== 1800FRESHTAX NETWORK ENTRIES ===');
lines.forEach(line => {
  if (line.includes('1800freshtax') && (line.includes('[REQ]') || line.includes('[RES]') || line.includes('Payload:'))) {
    if (line.length > 300) {
      console.log(line.substring(0, 300) + '...');
    } else {
      console.log(line);
    }
  }
});
