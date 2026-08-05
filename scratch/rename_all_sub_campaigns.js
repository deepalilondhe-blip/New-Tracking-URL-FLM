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

const renames = {
  "TRA-ST-TSG": "ST/TSG",
  "TRA-ST-TF": "ST/TF",
  "TRA-ST-SP": "ST/SP",
  "TRA-PPC/V9": "PPC/V9",
  "PPC-ST": "PPC/ST",
  "PPC-ST2": "PPC/ST2",
  "PPC-M/CA": "PPCM/CA",
  "PPC-FS": "PPC/FS",
  "PPC-CR": "PPC/CR",
  "TRA-PPCBTR": "PPCBTR",
  "TRA-PPCBM": "PPCBM"
};

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

    if (renames[title]) {
      const newTitle = renames[title];
      console.log(`✏️ Queueing rename: "${title}" -> "${newTitle}" (GID: ${sheetId})`);
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
  });

  if (requests.length === 0) {
    console.log('No sheets found to rename.');
    return;
  }

  console.log(`Sending batchUpdate to rename ${requests.length} sheets...`);
  await sheets.spreadsheets.batchUpdate({
    spreadsheetId,
    requestBody: {
      requests: requests
    }
  });

  console.log('✅ All subcampaign sheets successfully renamed in Google Sheets!');
}

run().catch(console.error);
