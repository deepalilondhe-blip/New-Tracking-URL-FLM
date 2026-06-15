const { google } = require('googleapis');
require('dotenv').config();

const SPREADSHEET_ID = '1hcJgC1E1Bw3V5WdYgPpumQXke_kzMbNX1rCH4kKCBwk';

(async () => {
  try {
    const auth = new google.auth.GoogleAuth({
      keyFile: 'service_account.json',
      scopes: ['https://www.googleapis.com/auth/spreadsheets']
    });
    const client = await auth.getClient();
    const sheets = google.sheets({ version: 'v4', auth: client });

    const todayDate = new Date();
    const dateTabName = `${String(todayDate.getDate()).padStart(2, '0')}-${String(todayDate.getMonth() + 1).padStart(2, '0')}-${String(todayDate.getFullYear()).slice(-2)}`;
    console.log(`Reading from tab: ${dateTabName}`);

    const res = await sheets.spreadsheets.values.get({
      spreadsheetId: SPREADSHEET_ID,
      range: `'${dateTabName}'!A:H`
    });

    console.log('📋 Current sheet rows:');
    if (res.data.values) {
      res.data.values.forEach((row, index) => {
        console.log(`Row ${index + 1}:`, JSON.stringify(row));
      });
    } else {
      console.log('No data found.');
    }
  } catch (err) {
    console.error('Error reading sheet:', err.message);
  }
})();
