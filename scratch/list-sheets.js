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

  console.log(`Listing all sheets for spreadsheet ID: ${spreadsheetId}...`);
  const meta = await sheets.spreadsheets.get({ spreadsheetId });
  
  meta.data.sheets.forEach(s => {
    console.log(`- Title: "${s.properties.title}" (GID: ${s.properties.sheetId})`);
  });
}

run().catch(console.error);
