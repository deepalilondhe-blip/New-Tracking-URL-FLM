require('dotenv').config();
const { google } = require('googleapis');
const path = require('path');

async function testAppend() {
  const auth = new google.auth.GoogleAuth({
    keyFile: path.join(__dirname, '../service_account.json'),
    scopes: ['https://www.googleapis.com/auth/spreadsheets']
  });
  const sheets = google.sheets({ version: 'v4', auth });
  
  const formattedRow = [
    'Test Date', 'D', 'Test', 'Test',
    `=HYPERLINK("https://example.com/tracking?a=1&b=2#hash", "Open Tracking")`,
    '50000', '50000', 'NY', '1234567890', '1234', '1234',
    `=HYPERLINK("https://example.com/origin?x=y", "View Page Origin")`,
    `=HYPERLINK("https://example.com/thankyou", "ViewThankURL")`,
    'TRUE', 'Verified', 'pass', 'U', 'TRUE', '10000', 'Step 1'
  ];

  await sheets.spreadsheets.values.append({
    spreadsheetId: process.env.GOOGLE_SHEET_ID,
    range: 'FTH-quesstionnarie!A:AC',
    valueInputOption: 'USER_ENTERED',
    requestBody: { values: [formattedRow] }
  });
  console.log('Appended test row!');
}
testAppend().catch(console.error);
