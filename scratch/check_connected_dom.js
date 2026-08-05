const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, '..', 'veepn_connected_dom.html');
if (fs.existsSync(filePath)) {
  const content = fs.readFileSync(filePath, 'utf8');
  console.log('--- Page text after connection attempt ---');
  // strip html tags
  const text = content.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
  console.log(text.substring(0, 1000));
} else {
  console.log('File not found.');
}
