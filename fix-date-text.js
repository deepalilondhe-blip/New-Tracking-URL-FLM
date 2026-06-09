const { google } = require('googleapis');
require('dotenv').config();

const SPREADSHEET_ID = '1hcJgC1E1Bw3V5WdYgPpumQXke_kzMbNX1rCH4kKCBwk';
const sheetName = '09-06-26';

(async () => {
  const auth = new google.auth.GoogleAuth({
    keyFile: 'service_account.json',
    scopes: ['https://www.googleapis.com/auth/spreadsheets']
  });
  const client = await auth.getClient();
  const sheets = google.sheets({ version: 'v4', auth: client });

  // Format today's date as DD/MM/YY
  const today = new Date();
  const dateStr = `'${String(today.getDate()).padStart(2, '0')}/${String(today.getMonth() + 1).padStart(2, '0')}/${String(today.getFullYear()).slice(-2)}`;

  console.log(`🌐 Setting date cell in B2 as text: ${dateStr}`);

  await sheets.spreadsheets.values.update({
    spreadsheetId: SPREADSHEET_ID,
    range: `'${sheetName}'!B2`,
    valueInputOption: 'USER_ENTERED',
    requestBody: {
      values: [[dateStr]]
    }
  });

  console.log('✅ Successfully updated B2 date cell text representation.');
})();
