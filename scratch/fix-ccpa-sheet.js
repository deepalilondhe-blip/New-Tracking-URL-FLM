const { google } = require('googleapis');
require('dotenv').config();

(async () => {
  const auth = new google.auth.GoogleAuth({
    keyFile: 'service_account.json',
    scopes: ['https://www.googleapis.com/auth/spreadsheets']
  });
  const client = await auth.getClient();
  const sheets = google.sheets({ version: 'v4', auth: client });
  const SPREADSHEET_ID = '1hcJgC1E1Bw3V5WdYgPpumQXke_kzMbNX1rCH4kKCBwk';

  console.log('🔄 Updating Google Sheet to insert tra.com and correct topmoneyprogram.com...');

  const updateValues = [
    [
      '14',
      'https://tra.com',
      'https://tra.com/ccpa-request',
      'N/A',
      'Google Pixel 10Pro 5G',
      'Chrome',
      'Thankyou',
      'Mail not generated'
    ],
    [
      '15',
      'https://topmoneyprogram.com',
      'https://topmoneyprogram.com/ccpa/',
      '54876',
      'Google Pixel 10Pro 5G',
      'Chrome',
      'Thankyou',
      'Mail not generated'
    ]
  ];

  await sheets.spreadsheets.values.update({
    spreadsheetId: SPREADSHEET_ID,
    range: `'26-06-26'!A16:H17`,
    valueInputOption: 'USER_ENTERED',
    requestBody: {
      values: updateValues
    }
  });

  console.log('✅ Sheet successfully updated!');
})();
