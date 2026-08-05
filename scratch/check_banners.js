const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, '..', 'veepn_vpn_real_dom.html');
if (fs.existsSync(filePath)) {
  const content = fs.readFileSync(filePath, 'utf8');
  console.log('File length:', content.length);
  // Search for any banner class
  const regex = /class="([^"]*banner[^"]*)"/gi;
  let match;
  while ((match = regex.exec(content)) !== null) {
    console.log('Found banner class:', match[1]);
  }
} else {
  console.log('File not found.');
}
