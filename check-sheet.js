const { google } = require('googleapis');
require('dotenv').config();

const SPREADSHEET_ID = '1hcJgC1E1Bw3V5WdYgPpumQXke_kzMbNX1rCH4kKCBwk';

(async () => {
  const auth = new google.auth.GoogleAuth({
    keyFile: 'service_account.json',
    scopes: ['https://www.googleapis.com/auth/spreadsheets']
  });
  const client = await auth.getClient();
  const sheets = google.sheets({ version: 'v4', auth: client });

  const res = await sheets.spreadsheets.values.get({
    spreadsheetId: SPREADSHEET_ID,
    range: `'09-06-26'!A:H`
  });

  console.log('📋 Current sheet rows:');
  if (res.data.values) {
    res.data.values.forEach((row, index) => {
      console.log(`Row ${index + 1}:`, JSON.stringify(row));
    });
  } else {
    console.log('No data found.');
  }
})();
