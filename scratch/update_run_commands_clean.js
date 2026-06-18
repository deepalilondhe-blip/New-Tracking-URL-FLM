const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, '..', 'Run Commands.txt');
if (!fs.existsSync(filePath)) {
  console.error('Run Commands.txt not found at:', filePath);
  process.exit(1);
}

let content = fs.readFileSync(filePath, 'utf8');

// Replace the verbose PowerShell commands with the simplified native viewport commands
const regex = /🔹 Mac - Firefox:\s+\$env:PROCESS_BROWSER="firefox";\s+\$env:PROCESS_LABEL="Mac - Firefox";\s+node run-master\.js\s+--campaign\s+([a-zA-Z0-9-_]+)\s+--viewport\s+desktop/g;

content = content.replace(regex, (match, campaignId) => {
  return `🔹 Mac - Firefox: node run-master.js --campaign ${campaignId} --viewport mac-firefox`;
});

fs.writeFileSync(filePath, content, 'utf8');
console.log('✅ Run Commands.txt simplified successfully!');
