const axios = require('axios');
const fs = require('fs');
const path = require('path');

(async () => {
  const extensionId = 'mpbjkejclgfgadiemmefgebjfooflfhl';
  const url = `https://clients2.google.com/service/update2/crx?response=redirect&prodversion=118.0&acceptformat=crx3&x=id%3D${extensionId}%26installsource%3Dondemand%26uc`;
  const destPath = path.join(__dirname, '..', 'buster.crx');
  
  console.log(`Downloading Buster CRX from: ${url}`);
  try {
    const response = await axios({
      method: 'get',
      url: url,
      responseType: 'stream',
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      }
    });
    
    const writer = fs.createWriteStream(destPath);
    response.data.pipe(writer);
    
    await new Promise((resolve, reject) => {
      writer.on('finish', resolve);
      writer.on('error', reject);
    });
    
    const stats = fs.statSync(destPath);
    console.log(`✅ Buster CRX downloaded successfully: ${destPath} (${stats.size} bytes)`);
  } catch (err) {
    console.error('❌ Failed to download Buster CRX:', err.message);
  }
})();
