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

  console.log(`Fetching spreadsheet metadata for ${spreadsheetId}...`);
  const meta = await sheets.spreadsheets.get({ spreadsheetId });
  
  // Find sheet with sheetId 1125130427
  const targetSheet = meta.data.sheets.find(s => s.properties.sheetId === 1125130427);
  if (!targetSheet) {
    console.error('❌ Could not find sheet with GID 1125130427!');
    return;
  }
  
  const title = targetSheet.properties.title;
  console.log(`✅ Found sheet: "${title}" (GID: 1125130427)`);

  // Read first 100 rows to see what's in there
  const res = await sheets.spreadsheets.values.get({
    spreadsheetId,
    range: `${title}!A1:Z1000`,
    valueRenderOption: 'FORMULA'
  });

  const rows = res.data.values || [];
  console.log(`Fetched ${rows.length} rows.`);
  if (rows.length > 0) {
    console.log('Headers / First Row:', rows[0]);
    for (let i = 1; i < Math.min(rows.length, 10); i++) {
      console.log(`Row ${i}:`, rows[i]);
    }
  }
}

run().catch(console.error);
