const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, '..', 'Run Commands.txt');
if (!fs.existsSync(filePath)) {
  console.error('Run Commands.txt not found at:', filePath);
  process.exit(1);
}

const content = fs.readFileSync(filePath, 'utf8');
const lines = content.split(/\r?\n/);
const newLines = [];

let currentCampaignId = null;

for (let i = 0; i < lines.length; i++) {
  const line = lines[i];
  newLines.push(line);

  // Check for desktop line to extract campaign ID
  const desktopMatch = line.match(/--campaign\s+([a-zA-Z0-9-_]+)\s+--viewport\s+desktop/);
  if (desktopMatch) {
    currentCampaignId = desktopMatch[1];
  }

  // Check for mobile line to append Mac - Firefox line
  const mobileMatch = line.match(/--campaign\s+([a-zA-Z0-9-_]+)\s+--viewport\s+mobile/);
  if (mobileMatch && currentCampaignId && mobileMatch[1] === currentCampaignId) {
    // Detect leading whitespace of the current line to match indentation
    const indentMatch = line.match(/^(\s*)/);
    const indent = indentMatch ? indentMatch[1] : '    ';
    const macCommand = `${indent}🔹 Mac - Firefox: $env:PROCESS_BROWSER="firefox"; $env:PROCESS_LABEL="Mac - Firefox"; node run-master.js --campaign ${currentCampaignId} --viewport desktop`;
    newLines.push(macCommand);
    currentCampaignId = null; // Reset
  }
}

fs.writeFileSync(filePath, newLines.join('\r\n'), 'utf8');
console.log('✅ Run Commands.txt updated successfully!');
