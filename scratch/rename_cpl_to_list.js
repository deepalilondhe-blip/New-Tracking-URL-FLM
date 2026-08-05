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
  const allSheets = meta.data.sheets || [];

  const targetSheet = allSheets.find(s => s.properties.title === 'TRA-LIST');

  if (!targetSheet) {
    console.log('❌ Tab "TRA-LIST" not found in spreadsheet!');
    return;
  }

  const sheetId = targetSheet.properties.sheetId;
  console.log(`Found "TRA-LIST" with GID: ${sheetId}. Renaming to "LIST"...`);

  await sheets.spreadsheets.batchUpdate({
    spreadsheetId,
    requestBody: {
      requests: [
        {
          updateSheetProperties: {
            properties: {
              sheetId: sheetId,
              title: 'LIST'
            },
            fields: 'title'
          }
        }
      ]
    }
  });

  console.log('✅ Successfully renamed tab "TRA-LIST" to "LIST"!');
}

run().catch(console.error);
