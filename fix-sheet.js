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

  // Get current values
  const res = await sheets.spreadsheets.values.get({
    spreadsheetId: SPREADSHEET_ID,
    range: 'Sheet1!A:A'
  });

  if (!res.data.values) {
    console.log('No rows to update.');
    return;
  }

  const values = res.data.values;
  let srCount = 1;
  const updates = [];

  // Row 1 is header: SR
  // Row 2 is date: 09/06/26
  // Row 3 onwards are entries
  for (let i = 2; i < values.length; i++) {
    updates.push({
      range: `Sheet1!A${i + 1}`,
      values: [[srCount]]
    });
    srCount++;
  }

  if (updates.length > 0) {
    await sheets.spreadsheets.values.batchUpdate({
      spreadsheetId: SPREADSHEET_ID,
      requestBody: {
        valueInputOption: 'USER_ENTERED',
        data: updates
      }
    });
    console.log(`✅ Successfully re-sequenced ${updates.length} rows to be 1 to ${srCount - 1}`);
  }
})();
