const fs = require('fs');
const path = require('path');

const logPath = 'C:\\Users\\Deepali_Londhe\\.gemini\\antigravity\\brain\\6f01cb3d-4e70-4a1d-8884-d2a7a74a3258\\.system_generated\\tasks\\task-4151.log';
if (!fs.existsSync(logPath)) {
  console.error('Log file not found');
  process.exit(1);
}

const content = fs.readFileSync(logPath, 'utf8');
const lines = content.split('\n');

console.log('=== FIRST 50 LINES IN TASK-4151.LOG ===');
for (let i = 0; i < 50 && i < lines.length; i++) {
  console.log(lines[i]);
}
