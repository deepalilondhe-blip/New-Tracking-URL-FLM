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

const renameMap = {
  "Original": "1800",
  "1800 Fresh Tax (X) Main": "1800X",
  "America's First Tax Relief (AFTR)": "AFTR",
  "Everest Tax Releif(X)": "ETR",
  "FTD-X": "FTD",
  "FSI - MAIN": "FSI",
  "FSI-PPC2": "FSI PPC",
  "Fresh Start Initiative (X) Main": "FSI X",
  "Guardian Tax Relief (PPC)": "GT",
  "Premier Tax Relief (PTR)": "PTR",
  "SCTR-Main": "SCTR",
  "Senior Tax Defence-Main": "STD",
  "Senior Tax Defense (X)": "STD X",
  "VTS-NE-Branded": "VTS",
  "TRA-CPM": "TRA cpm",
  "TRA-DT3": "TRA x"
};

async function run() {
  const client = await authenticate();
  const sheets = google.sheets({ version: 'v4', auth: client });
  const spreadsheetId = process.env.GOOGLE_SHEET_ID;

  console.log(`Fetching spreadsheet metadata for ${spreadsheetId}...`);
  const meta = await sheets.spreadsheets.get({ spreadsheetId });
  const existingSheets = meta.data.sheets || [];
  const existingTitles = existingSheets.map(s => s.properties.title);

  const requests = [];

  existingSheets.forEach(s => {
    const title = s.properties.title;
    const sheetId = s.properties.sheetId;

    if (renameMap[title]) {
      const newTitle = renameMap[title];
      
      // Only rename if the new title does not already exist
      if (existingTitles.includes(newTitle)) {
        console.log(`⚠️ Skip renaming "${title}" -> "${newTitle}" because "${newTitle}" already exists!`);
      } else {
        console.log(`📝 Queueing rename: "${title}" -> "${newTitle}" (GID: ${sheetId})`);
        requests.push({
          updateSheetProperties: {
            properties: {
              sheetId: sheetId,
              title: newTitle
            },
            fields: 'title'
          }
        });
      }
    }
  });

  if (requests.length === 0) {
    console.log('No sheets need to be renamed.');
    return;
  }

  console.log(`Sending batchUpdate with ${requests.length} rename requests...`);
  const response = await sheets.spreadsheets.batchUpdate({
    spreadsheetId,
    requestBody: {
      requests: requests
    }
  });

  console.log('✅ Spreadsheet tabs successfully renamed!');
}

run().catch(console.error);
