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
  const clientSpreadsheetId = '1TJYMxbyREFVIIGYIdb15SpwG0X6Kmm4nhmBS_OUE8EY';

  console.log(`Reading all columns from client spreadsheet: ${clientSpreadsheetId}`);
  const res = await sheets.spreadsheets.values.get({
    spreadsheetId: clientSpreadsheetId,
    range: `offers!A1:Z35`,
  });

  const rows = res.data.values || [];
  console.log(`Total rows fetched: ${rows.length}`);
  rows.forEach((row, idx) => {
    console.log(`Row ${idx + 1}:`, row.join(' | '));
  });
}

run().catch(console.error);
