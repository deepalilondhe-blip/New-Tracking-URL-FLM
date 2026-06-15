const {google} = require('googleapis');
const path = require('path');
const fs = require('fs');

const credentialsPath = path.join(__dirname, '..', 'service_account.json');
const credentials = JSON.parse(fs.readFileSync(credentialsPath, 'utf8'));

async function checkSheet() {
  const auth = new google.auth.GoogleAuth({
    credentials,
    scopes: ['https://www.googleapis.com/auth/spreadsheets.readonly']
  });
  const client = await auth.getClient();
  const sheets = google.sheets({version: 'v4', auth: client});

  const spreadsheetId = '1rXIg3dMQ4APH3lHLcfWYfP45PnOAKmV9POkoSS3YWxI';
  const range = 'FSI - MAIN!A1:Z150';
  const res = await sheets.spreadsheets.values.get({
    spreadsheetId,
    range
  });

  const rows = res.data.values || [];
  if (rows.length === 0) {
    console.log('No data found.');
    return;
  }
  
  const headers = rows[0];
  console.log('Headers:', headers);
  
  const lastRow = rows[rows.length - 1];
  console.log('Last Row:', lastRow);
  
  // Print each column header with its value
  headers.forEach((header, index) => {
    console.log(`${header}: ${lastRow[index] || ''}`);
  });
}

checkSheet().catch(console.error);
