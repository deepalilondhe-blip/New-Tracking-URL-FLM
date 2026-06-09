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

  // Read Sheet to find row of tra.com
  const dateName = '09-06-26'; // Renamed tab name
  const res = await sheets.spreadsheets.values.get({
    spreadsheetId: SPREADSHEET_ID,
    range: `'09-06-26'!A:H`
  });

  if (!res.data.values) {
    console.log('No data found.');
    return;
  }

  const values = res.data.values;
  for (let i = 0; i < values.length; i++) {
    const domain = values[i][1] || '';
    if (domain.toLowerCase().includes('tra.com')) {
      const rowIndex = i + 1;
      console.log(`🔍 Found tra.com on row ${rowIndex}. Clearing Column D...`);
      await sheets.spreadsheets.values.update({
        spreadsheetId: SPREADSHEET_ID,
        range: `'09-06-26'!D${rowIndex}`,
        valueInputOption: 'USER_ENTERED',
        requestBody: {
          values: [['']]
        }
      });
      console.log(`✅ Cleared Column D for row ${rowIndex}`);
    }
  }
})();
