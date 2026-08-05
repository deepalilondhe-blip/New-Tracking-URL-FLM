const fs = require('fs');
const path = require('path');
const os = require('os');

const dbPath = path.join(os.homedir(), '.n8n', 'database.sqlite');
console.log(`Checking for database at: ${dbPath}`);
if (fs.existsSync(dbPath)) {
  console.log('✅ Database exists!');
  const stats = fs.statSync(dbPath);
  console.log(`Size: ${stats.size} bytes`);
} else {
  console.log('❌ Database not found.');
}
