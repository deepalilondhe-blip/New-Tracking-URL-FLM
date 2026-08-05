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

  console.log(`Fetching sheet tabs for client spreadsheet: ${clientSpreadsheetId}`);
  const clientMeta = await sheets.spreadsheets.get({ spreadsheetId: clientSpreadsheetId });
  const allSheets = clientMeta.data.sheets || [];
  console.log(`Total sheets found: ${allSheets.length}`);
  allSheets.forEach(s => {
    console.log(`- Title: "${s.properties.title}" (GID: ${s.properties.sheetId})`);
  });
}

run().catch(console.error);
