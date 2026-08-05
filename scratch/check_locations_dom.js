const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, '..', 'veepn_locations.html');
if (fs.existsSync(filePath)) {
  const content = fs.readFileSync(filePath, 'utf8');
  console.log('File length:', content.length);
  
  // Search for list items or elements containing text
  const regex = /<li[^>]*>([\s\S]*?)<\/li>/gi;
  let match;
  console.log('--- List Items (li) ---');
  let count = 0;
  while ((match = regex.exec(content)) !== null && count < 20) {
    console.log(`LI ${count}:`, match[1].replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim());
    count++;
  }

  // Look for any text like United States or US
  const usRegex = /([A-Za-z\s]{3,30})/g;
  console.log('--- Matches for USA/United States in text ---');
  if (content.toLowerCase().includes('united states')) {
    console.log('✅ Found "united states" in HTML source!');
  } else {
    console.log('❌ Did NOT find "united states" in HTML source.');
  }

} else {
  console.log('File not found.');
}
