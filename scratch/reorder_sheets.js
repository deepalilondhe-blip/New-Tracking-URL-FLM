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

const activeOrder = [
  "1800", "1800X", "AFTR", "ETR", "FTD", "FSI", "FSI PPC", "FSI X",
  "GT", "PTR", "SCTR", "STD", "STD X", "VTS", "TRA cpm", "TRA x",
  "ST/TSG", "ST/TF", "ST/SP", "PPC/V9", "PPC/ST",
  "PPC/ST2", "PPCM/CA", "PPC/FS", "PPC/CR", "PPCBTR", "PPCBM", "LIST"
];

async function run() {
  const client = await authenticate();
  const sheets = google.sheets({ version: 'v4', auth: client });
  const spreadsheetId = process.env.GOOGLE_SHEET_ID;

  console.log(`Fetching spreadsheet metadata for ${spreadsheetId}...`);
  const meta = await sheets.spreadsheets.get({ spreadsheetId });
  const allSheets = meta.data.sheets || [];

  // Sort sheets: activeOrder sheets first in their specified order, other sheets afterwards
  const sortedSheets = [...allSheets].sort((a, b) => {
    const titleA = a.properties.title;
    const titleB = b.properties.title;

    const indexA = activeOrder.indexOf(titleA);
    const indexB = activeOrder.indexOf(titleB);

    if (indexA !== -1 && indexB !== -1) {
      return indexA - indexB;
    } else if (indexA !== -1) {
      return -1; // a comes first
    } else if (indexB !== -1) {
      return 1;  // b comes first
    } else {
      // Keep alphabetical order for non-active/backup sheets
      return titleA.localeCompare(titleB);
    }
  });

  console.log('Target Sorted Order:');
  sortedSheets.forEach((s, idx) => {
    console.log(`  ${idx + 1}. "${s.properties.title}" (GID: ${s.properties.sheetId})`);
  });

  const requests = sortedSheets.map((s, idx) => {
    return {
      updateSheetProperties: {
        properties: {
          sheetId: s.properties.sheetId,
          index: idx
        },
        fields: 'index'
      }
    };
  });

  console.log(`Sending batchUpdate to reorder ${requests.length} sheets...`);
  await sheets.spreadsheets.batchUpdate({
    spreadsheetId,
    requestBody: {
      requests: requests
    }
  });

  console.log('✅ Spreadsheet tabs successfully reordered!');
}

run().catch(console.error);
