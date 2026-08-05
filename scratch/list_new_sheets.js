const { google } = require('googleapis');
const path = require('path');
const fs = require('fs');

async function authenticate(keyFilename) {
  const auth = new google.auth.GoogleAuth({
    keyFile: path.join(__dirname, '..', keyFilename),
    scopes: ['https://www.googleapis.com/auth/spreadsheets']
  });
  return auth.getClient();
}

async function tryAccess(keyFilename) {
  const spreadsheetId = '1TJYMxbyREFVIIGYIdb15SpwG0X6Kmm4nhmBS_OUE8EY';
  console.log(`\n🔑 Trying key file: ${keyFilename}...`);
  try {
    const client = await authenticate(keyFilename);
    const sheets = google.sheets({ version: 'v4', auth: client });
    const meta = await sheets.spreadsheets.get({ spreadsheetId });
    console.log(`✅ SUCCESS! Found ${meta.data.sheets.length} sheets:`);
    meta.data.sheets.forEach(s => {
      console.log(`- Title: "${s.properties.title}" (GID: ${s.properties.sheetId})`);
    });
    return true;
  } catch (err) {
    console.error(`❌ FAILED for ${keyFilename}:`, err.message);
    return false;
  }
}

async function run() {
  const first = await tryAccess('service_account.json');
  const second = await tryAccess('service-account-creds.json');
}

run().catch(console.error);
