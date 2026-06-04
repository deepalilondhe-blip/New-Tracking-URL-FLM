const fs = require('fs');
const content = fs.readFileSync('./logs/scheduler/scheduler_run_20260206_130001.log', 'utf8');
const regex = /leadid['"]?\s*:\s*['"]([A-Z0-9]{8})['"]/ig;
console.log('Matches:', content.match(regex));
let match, last = null;
while ((match = regex.exec(content)) !== null) {
  last = match[1];
}
console.log('Last extracted:', last);
