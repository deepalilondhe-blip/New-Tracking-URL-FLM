const https = require('https');
const fs = require('fs');
const url = 'http://clients2.google.com/service/update2/crx?response=redirect&prodversion=38.0&x=id%3Dmajdfhpaihoncoakbjgbdhglocklcgno%26installsource%3Dondemand%26uc';

function download(targetUrl) {
  console.log(`Requesting: ${targetUrl}`);
  const client = targetUrl.startsWith('https') ? require('https') : require('http');
  client.get(targetUrl, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/98.0.4758.102 Safari/537.36'
    }
  }, (res) => {
    console.log(`Status: ${res.statusCode}`);
    console.log(`Headers:`, res.headers);

    if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
      download(res.headers.location);
      return;
    }

    const file = fs.createWriteStream('veepn.crx');
    res.pipe(file);
    file.on('finish', () => {
      file.close();
      console.log('Finished downloading to veepn.crx');
      console.log(`Downloaded file size: ${fs.statSync('veepn.crx').size} bytes`);
    });
  }).on('error', (err) => {
    console.error('Error:', err.message);
  });
}

download(url);
