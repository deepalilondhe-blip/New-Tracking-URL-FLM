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

    const response = await sheets.spreadsheets.get({
      spreadsheetId: SPREADSHEET_ID,
      ranges: ['09-06-26!A1:H1'],
      includeGridData: true
    });

    const sheet = response.data.sheets[0];
    const colMetadata = sheet.data[0].columnMetadata;
    if (colMetadata) {
      colMetadata.forEach((col, index) => {
        console.log(`Column ${index} width (pixelSize):`, col.pixelSize);
      });
    } else {
      console.log('No column metadata found.');
    }

  } catch (err) {
    console.error('Error:', err.message);
  }
})();
