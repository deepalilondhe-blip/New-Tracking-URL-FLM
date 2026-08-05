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

  const sourceSheet = allSheets.find(s => s.properties.title === 'PPCBTR');
  const targetSheetExists = allSheets.find(s => s.properties.title === 'PPCBM');

  if (targetSheetExists) {
    console.log('✅ Sheet "PPCBM" already exists!');
    return;
  }

  if (!sourceSheet) {
    console.error('❌ Source sheet "PPCBTR" not found to copy from!');
    return;
  }

  const sourceSheetId = sourceSheet.properties.sheetId;

  console.log(`Copying "PPCBTR" (GID: ${sourceSheetId}) to create "PPCBM"...`);
  const copyRes = await sheets.spreadsheets.sheets.copyTo({
    spreadsheetId,
    sheetId: sourceSheetId,
    requestBody: {
      destinationSpreadsheetId: spreadsheetId
    }
  });

  const newSheetId = copyRes.data.sheetId;
  const newTitle = copyRes.data.title;
  console.log(`Successfully copied. New sheet GID: ${newSheetId}, Title: "${newTitle}"`);

  console.log(`Renaming copied sheet to "PPCBM"...`);
  await sheets.spreadsheets.batchUpdate({
    spreadsheetId,
    requestBody: {
      requests: [
        {
          updateSheetProperties: {
            properties: {
              sheetId: newSheetId,
              title: 'PPCBM'
            },
            fields: 'title'
          }
        }
      ]
    }
  });

  // Clear data in the new sheet, keeping only the headers (Row 1)
  console.log('Clearing rows starting from row 2 in the new "PPCBM" sheet...');
  await sheets.spreadsheets.values.clear({
    spreadsheetId,
    range: `'PPCBM'!A2:Z1000`
  });

  console.log('✅ Sheet "PPCBM" successfully created, formatted, and cleared!');
}

run().catch(console.error);
