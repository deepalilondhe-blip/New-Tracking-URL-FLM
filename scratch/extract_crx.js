const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const crxPath = path.join(__dirname, '..', 'veepn.zip');
const zipPath = path.join(__dirname, '..', 'veepn_clean.zip');
const extractDir = path.join(__dirname, '..', 'veepn-extension');

if (!fs.existsSync(crxPath)) {
  console.error('veepn.zip not found.');
  process.exit(1);
}

const buffer = fs.readFileSync(crxPath);
// Search for PK\x03\x04 signature (50 4B 03 04)
const zipHeader = Buffer.from([0x50, 0x4B, 0x03, 0x04]);
const index = buffer.indexOf(zipHeader);

if (index === -1) {
  console.error('Could not find ZIP header in CRX file.');
  process.exit(1);
}

console.log(`Found ZIP header at offset: ${index}`);
const cleanZipBuffer = buffer.slice(index);
fs.writeFileSync(zipPath, cleanZipBuffer);
console.log('Saved clean ZIP file to veepn_clean.zip');

if (!fs.existsSync(extractDir)) {
  fs.mkdirSync(extractDir);
}

try {
  console.log('Extracting using PowerShell Expand-Archive...');
  execSync(`powershell -Command "Expand-Archive -Path '${zipPath}' -DestinationPath '${extractDir}' -Force"`);
  console.log('✅ Extraction completed successfully!');
  
  // Cleanup temp zip files
  fs.unlinkSync(crxPath);
  fs.unlinkSync(zipPath);
  console.log('Cleaned up temporary zip files.');
} catch (err) {
  console.error('Extraction failed:', err.message);
}
