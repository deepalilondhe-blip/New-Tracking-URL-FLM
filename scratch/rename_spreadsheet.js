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
  const newTitle = "FLM QA URLs July 2026";

  console.log(`Renaming spreadsheet ${spreadsheetId} to "${newTitle}"...`);

  await sheets.spreadsheets.batchUpdate({
    spreadsheetId,
    requestBody: {
      requests: [
        {
          updateSpreadsheetProperties: {
            properties: {
              title: newTitle
            },
            fields: 'title'
          }
        }
      ]
    }
  });

  console.log('✅ Spreadsheet successfully renamed!');
}

run().catch(console.error);
