const { google } = require('googleapis');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

async function authenticate() {
  const auth = new google.auth.GoogleAuth({
    keyFile: path.join(__dirname, '..', process.env.GOOGLE_SERVICE_ACCOUNT_FILE),
    scopes: ['https://www.googleapis.com/auth/spreadsheets']
  });
  return auth.getClient();
}

async function run() {
  const client = await authenticate();
  const sheets = google.sheets({ version: 'v4', auth: client });
  const spreadsheetId = process.env.GOOGLE_SHEET_ID;

  console.log(`Reading LIST tab...`);
  const res = await sheets.spreadsheets.values.get({
    spreadsheetId,
    range: `'LIST'!A300:H325`,
  });

  const rows = res.data.values || [];
  console.log(`Rows fetched from LIST tab: ${rows.length}`);
  rows.forEach((row, idx) => {
    console.log(`Row ${idx + 300}:`, row.join(' | '));
  });
}

run().catch(console.error);
