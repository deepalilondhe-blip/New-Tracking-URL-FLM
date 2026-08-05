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

  console.log(`Fetching all rows of "TRA-CPL" tab...`);
  const response = await sheets.spreadsheets.values.get({
    spreadsheetId,
    range: `'TRA-CPL'!A:K`,
  });

  const rows = response.data.values || [];
  console.log(`Total rows fetched: ${rows.length}`);
  
  // Show the last 10 rows
  const start = Math.max(0, rows.length - 10);
  for (let i = start; i < rows.length; i++) {
    console.log(`Row ${i + 1}:`, rows[i].slice(0, 11).join(' | '));
  }
}

run().catch(console.error);
