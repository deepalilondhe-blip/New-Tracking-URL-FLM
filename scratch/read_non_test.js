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

  console.log(`Reading "Non Test" of spreadsheet ${spreadsheetId}...`);
  const res = await sheets.spreadsheets.values.get({
    spreadsheetId,
    range: `'Non Test'!A1:E30`,
  });

  const rows = res.data.values || [];
  console.log(`Total rows fetched from "Non Test": ${rows.length}`);
  rows.forEach((row, idx) => {
    console.log(`Row ${idx + 1}:`, row.join(' | '));
  });
}

run().catch(console.error);
