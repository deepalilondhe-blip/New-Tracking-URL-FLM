const fs = require('fs');
const path = require('path');

const logPath = 'C:\\Users\\Deepali_Londhe\\.gemini\\antigravity\\brain\\051ad8c7-856b-4bd2-8827-df0d323ce5d5\\.system_generated\\tasks\\task-518.log';

if (fs.existsSync(logPath)) {
  const content = fs.readFileSync(logPath, 'utf8');
  const lines = content.split('\n');
  lines.forEach((line, index) => {
    if (line.includes('FAILED:') || line.includes('❌') || line.includes('Failed:')) {
      console.log(`${index + 1}: ${line}`);
    }
  });
} else {
  console.log('Log file not found.');
}
