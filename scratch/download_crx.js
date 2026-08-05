const fs = require('fs');
const path = require('path');
const axios = require('axios');
const { execSync } = require('child_process');

const extensionId = 'majdfhpaihoncoakbjgbdhglocklcgno';
const url = `https://clients2.google.com/service/update2/crx?response=redirect&prodversion=98.0&acceptformat=crx2,crx3&x=id%3D${extensionId}%26uc`;
const zipPath = path.join(__dirname, '..', 'veepn_clean.zip');
const extractDir = path.join(__dirname, '..', 'veepn-extension');

async function main() {
  console.log(`Downloading CRX for extension ${extensionId}...`);
  try {
    const response = await axios({
      method: 'get',
      url: url,
      responseType: 'arraybuffer',
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/98.0.4758.102 Safari/537.36'
      }
    });

    const buffer = Buffer.from(response.data);
    console.log(`Downloaded ${buffer.length} bytes.`);

    // Find ZIP header PK\x03\x04 (50 4B 03 04)
    const zipHeader = Buffer.from([0x50, 0x4B, 0x03, 0x04]);
    const index = buffer.indexOf(zipHeader);

    if (index === -1) {
      console.error('Could not find ZIP header in downloaded CRX data. It might not be a valid CRX file.');
      process.exit(1);
    }

    console.log(`Found ZIP header at offset: ${index}`);
    const cleanZipBuffer = buffer.slice(index);
    fs.writeFileSync(zipPath, cleanZipBuffer);
    console.log('Saved clean ZIP file to veepn_clean.zip');

    if (!fs.existsSync(extractDir)) {
      fs.mkdirSync(extractDir);
    }

    console.log('Extracting using PowerShell Expand-Archive...');
    execSync(`powershell -Command "Expand-Archive -Path '${zipPath}' -DestinationPath '${extractDir}' -Force"`);
    console.log('✅ Extraction completed successfully!');
    
    // Cleanup
    fs.unlinkSync(zipPath);
    console.log('Cleaned up temporary zip files.');
  } catch (error) {
    console.error('Error occurred:', error.message);
    process.exit(1);
  }
}

main();
