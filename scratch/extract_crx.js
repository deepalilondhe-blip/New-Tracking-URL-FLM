const fs = require('fs');
const path = require('path');

(async () => {
  const crxPath = path.join(__dirname, '..', 'buster.crx');
  const zipPath = path.join(__dirname, '..', 'buster.zip');
  
  try {
    const buffer = fs.readFileSync(crxPath);
    
    // Validate CRX magic number
    const magic = buffer.toString('utf8', 0, 4);
    if (magic !== 'Cr24') {
      throw new Error(`Invalid CRX magic number: ${magic}. Expected "Cr24".`);
    }
    
    // Validate version
    const version = buffer.readUInt32LE(4);
    console.log(`CRX format version: ${version}`);
    
    let zipStartOffset = 0;
    
    if (version === 2) {
      const publicKeyLength = buffer.readUInt32LE(8);
      const signatureLength = buffer.readUInt32LE(12);
      zipStartOffset = 16 + publicKeyLength + signatureLength;
    } else if (version === 3) {
      const headerLength = buffer.readUInt32LE(8);
      zipStartOffset = 12 + headerLength;
    } else {
      throw new Error(`Unsupported CRX version: ${version}`);
    }
    
    console.log(`CRX Header ends at offset: ${zipStartOffset} bytes`);
    
    // Extract the ZIP contents
    const zipBuffer = buffer.subarray(zipStartOffset);
    fs.writeFileSync(zipPath, zipBuffer);
    console.log(`✅ Saved ZIP contents to: ${zipPath} (${zipBuffer.length} bytes)`);
  } catch (err) {
    console.error('❌ Failed to convert CRX to ZIP:', err.message);
  }
})();
