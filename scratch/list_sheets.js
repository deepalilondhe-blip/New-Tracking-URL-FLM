const { google } = require('googleapis');
require('dotenv').config();

const SPREADSHEET_ID = '1rXIg3dMQ4APH3lHLcfWYfP45PnOAKmV9POkoSS3YWxI';

(async () => {
  try {
    const auth = new google.auth.GoogleAuth({
      keyFile: 'service_account.json',
      scopes: ['https://www.googleapis.com/auth/spreadsheets']
    });
    const client = await auth.getClient();
    const sheets = google.sheets({ version: 'v4', auth: client });

    console.log('\n📋 Last 5 Rows of Guardian Tax Relief (PPC):');
    const res = await sheets.spreadsheets.values.get({
      spreadsheetId: SPREADSHEET_ID,
      range: `'Guardian Tax Relief (PPC)'!A:AC`
    });

    if (res.data.values) {
      const rows = res.data.values;
      const start = Math.max(0, rows.length - 5);
      for (let i = start; i < rows.length; i++) {
        console.log(`Row ${i + 1}:`, JSON.stringify(rows[i]));
      }
    } else {
      console.log('No data in Guardian Tax Relief (PPC)');
    }
  } catch (err) {
    console.error('Error:', err.message);
  }
})();
