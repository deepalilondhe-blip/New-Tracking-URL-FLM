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

const sheetsToDelete = [
  "VTS-Original",
  "1803 Fresh Tax - AFR cobranded",
  "PPC",
  "FTH-quesstionnarie",
  "FTH-X",
  "Second Chance Tax Relief (X)",
  "1800 Fresh Tax (CPC)",
  "Empire Tax Relief (X)",
  "Capital Tax Relief (X)",
  "FTD-PPC2",
  "Original",
  "1800 Fresh Tax (X) Main",
  "FTD-X",
  "VTS-NE-Branded",
  "TRA-CPM",
  "Everest Tax Releif(X)",
  "PPC FS",
  "Sheet2"
];

async function run() {
  const client = await authenticate();
  const sheets = google.sheets({ version: 'v4', auth: client });
  const spreadsheetId = process.env.GOOGLE_SHEET_ID;

  console.log(`Fetching spreadsheet metadata for ${spreadsheetId}...`);
  const meta = await sheets.spreadsheets.get({ spreadsheetId });
  const allSheets = meta.data.sheets || [];

  const requests = [];

  allSheets.forEach(s => {
    const title = s.properties.title;
    const sheetId = s.properties.sheetId;

    if (sheetsToDelete.includes(title)) {
      console.log(`🗑️ Queueing deletion of sheet: "${title}" (GID: ${sheetId})`);
      requests.push({
        deleteSheet: {
          sheetId: sheetId
        }
      });
    }
  });

  if (requests.length === 0) {
    console.log('No deprecated sheets found to delete.');
    return;
  }

  console.log(`Sending batchUpdate to delete ${requests.length} deprecated sheets...`);
  await sheets.spreadsheets.batchUpdate({
    spreadsheetId,
    requestBody: {
      requests: requests
    }
  });

  console.log('✅ Deprecated sheets successfully deleted from Google Sheets!');
}

run().catch(console.error);
