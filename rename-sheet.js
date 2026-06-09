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

  // Get sheet metadata to find Sheet1's sheetId
  const meta = await sheets.spreadsheets.get({ spreadsheetId: SPREADSHEET_ID });
  const sheet = meta.data.sheets.find(s => s.properties.title === 'Sheet1');
  
  if (!sheet) {
    console.log('⚠️ Could not find tab named "Sheet1". Maybe it is already renamed.');
    return;
  }

  const sheetId = sheet.properties.sheetId;

  // Format today's date as DD-MM-YY (e.g., 09-06-26)
  const today = new Date();
  const dateName = `${String(today.getDate()).padStart(2, '0')}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getFullYear()).slice(-2)}`;

  console.log(`🌐 Renaming sheet tab to: ${dateName}`);

  await sheets.spreadsheets.batchUpdate({
    spreadsheetId: SPREADSHEET_ID,
    requestBody: {
      requests: [{
        updateSheetProperties: {
          properties: {
            sheetId: sheetId,
            title: dateName
          },
          fields: 'title'
        }
      }]
    }
  });

  console.log(`✅ Successfully renamed sheet tab to: ${dateName}`);
})();
