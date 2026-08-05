const fs = require('fs');
const path = require('path');
const os = require('os');

const extId = 'majdfhpaihoncoakbjgbdhglocklcgno';
const srcDir = path.join(os.homedir(), 'AppData', 'Local', 'Google', 'Chrome', 'User Data', 'Profile 1', 'Extensions', extId, '4.0.2_0');
const destDir = path.join(__dirname, '..', 'veepn-extension');

function copyFolderRecursiveSync(source, target) {
  let files = [];

  // Check if folder needs to be created or clean
  if (!fs.existsSync(target)) {
    fs.mkdirSync(target, { recursive: true });
  }

  // Copy
  if (fs.lstatSync(source).isDirectory()) {
    files = fs.readdirSync(source);
    files.forEach(function (file) {
      const curSource = path.join(source, file);
      const curTarget = path.join(target, file);
      if (fs.lstatSync(curSource).isDirectory()) {
        copyFolderRecursiveSync(curSource, curTarget);
      } else {
        fs.copyFileSync(curSource, curTarget);
      }
    });
  }
}

console.log(`Copying from: ${srcDir}`);
console.log(`To: ${destDir}`);

if (fs.existsSync(srcDir)) {
  copyFolderRecursiveSync(srcDir, destDir);
  console.log('✅ VeePN extension copied successfully to project folder!');
} else {
  console.error('❌ Source directory does not exist!');
  process.exit(1);
}
