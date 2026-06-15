const fs = require('fs');
const path = require('path');

const logPath = 'C:\\Users\\Deepali_Londhe\\.gemini\\antigravity\\brain\\6f01cb3d-4e70-4a1d-8884-d2a7a74a3258\\.system_generated\\tasks\\task-4122.log';
if (!fs.existsSync(logPath)) {
  console.error('Log file not found');
  process.exit(1);
}

const content = fs.readFileSync(logPath, 'utf8');
const lines = content.split('\n');

console.log('=== ALL POST REQUESTS ===');
lines.forEach(line => {
  if (line.includes('POST')) {
    console.log(line);
  }
});
