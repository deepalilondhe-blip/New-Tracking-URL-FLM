const fs = require('fs');
const path = require('path');
const os = require('os');

const extId = 'majdfhpaihoncoakbjgbdhglocklcgno';
const extensionsDir = path.join(os.homedir(), 'AppData', 'Local', 'Google', 'Chrome', 'User Data', 'Default', 'Extensions', extId);

console.log(`Checking for extension folder at: ${extensionsDir}`);
if (fs.existsSync(extensionsDir)) {
  console.log('✅ Extension folder found!');
  const versions = fs.readdirSync(extensionsDir);
  console.log('Versions:', versions);
} else {
  console.log('❌ Extension folder not found in Default profile.');
  // Check other potential profiles
  const profilesDir = path.join(os.homedir(), 'AppData', 'Local', 'Google', 'Chrome', 'User Data');
  if (fs.existsSync(profilesDir)) {
    const files = fs.readdirSync(profilesDir);
    files.forEach(f => {
      if (f.startsWith('Profile ') || f === 'Default') {
        const pDir = path.join(profilesDir, f, 'Extensions', extId);
        if (fs.existsSync(pDir)) {
          console.log(`✅ Extension folder found in profile "${f}": ${pDir}`);
          const versions = fs.readdirSync(pDir);
          console.log('Versions:', versions);
        }
      }
    });
  }
}
