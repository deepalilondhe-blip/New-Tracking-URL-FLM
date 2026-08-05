const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, '..', 'veepn_vpn_real_dom.html');
const content = fs.readFileSync(filePath, 'utf8');

const regex = /<button[^>]*class="([^"]*)"[^>]*>([\s\S]*?)<\/button>/gi;
let match;
console.log('--- Buttons found in DOM ---');
while ((match = regex.exec(content)) !== null) {
  console.log(`Class: "${match[1]}"`);
  console.log(`Text/Content: "${match[2].trim().substring(0, 100)}"\n`);
}

const divRegex = /<div[^>]*class="([^"]*)"[^>]*>([\s\S]*?)<\/div>/gi;
console.log('--- Divs with off/connect in class or content ---');
while ((match = divRegex.exec(content)) !== null) {
  const className = match[1];
  const inner = match[2];
  if (className.includes('connect') || className.includes('power') || className.includes('main-button') || inner.includes('Connection is')) {
    console.log(`Class: "${className}"`);
    console.log(`Content: "${inner.trim().substring(0, 150)}"\n`);
  }
}
