const { google } = require('googleapis');
require('dotenv').config();

const SHEET_NAMES = [
  "FTD", "VTS-Original", "VTS-NE-Branded", "Original",
  "SCTR-Secondary", "1800-FTH-Main", "1800-FTH-AFR",
  "SCTD-Main", "FSI-MAIN", "FTD-PPC2", "TRA-CPL", "PPC",
  "PPC-ST", "PPC-S2", "PPC-MCA", "PPC-FS", "PPC-CR",
  "AFTR", "TRA-CPM", "Premier-TR", "FTH-Q", "TRA-DT3",
  "SCTR-Main", "1800-FTH-CPC", "Guardian-TR", "Everest-TR",
  "SCTD-Alt", "Empire-TR", "Capital-TR"
];

const HEADERS = [
  "Date", "D/M", "Affiliate", "Campaign ID", "Link", "Step 1",
  "Cake Income", "State", "Phone", "Lead ID", "DBID",
  "Thank You URL", "Page Origin", "CDB", "CDB Email",
  "Neustar", "Neustar Disposition", "Pixel Fired", "Run Date"
];

async function authenticate() {
  const auth = new google.auth.GoogleAuth({
    keyFile: 'service-account-creds.json',
    scopes: ['https://www.googleapis.com/auth/spreadsheets']
  });
  return auth.getClient();
}

async function setupSheets() {
  try {
    const client = await authenticate();
    const sheets = google.sheets({ version: 'v4', auth: client });
    const spreadsheetId = process.env.GOOGLE_SHEET_ID;

    // Get existing sheets
    const spreadsheet = await sheets.spreadsheets.get({
      spreadsheetId,
      fields: 'sheets.properties.title'
    });

    const existingSheets = new Set(
      spreadsheet.data.sheets.map(sheet => sheet.properties.title)
    );

    const requests = [];
    let sheetsCreated = 0;

    for (const sheetName of SHEET_NAMES) {
      if (existingSheets.has(sheetName)) {
        console.log(`Tab ${sheetName} already exists, skipping...`);
        continue;
      }

      console.log(`Creating tab: ${sheetName}...`);

      // Create new sheet
      requests.push({
        addSheet: {
          properties: {
            title: sheetName,
            index: SHEET_NAMES.indexOf(sheetName)
          }
        }
      });

      // Get sheet ID for formatting
      const newSheetId = sheetsCreated;

      // Write headers
      requests.push({
        updateCells: {
          rows: [{
            values: HEADERS.map(header => ({
              userEnteredValue: { stringValue: header },
              userEnteredFormat: {
                backgroundColor: { red: 0.13, green: 0.59, blue: 0.95 },
                textFormat: {
                  foregroundColor: { red: 1, green: 1, blue: 1 },
                  bold: true,
                  fontSize: 11
                }
              }
            }))
          }],
          fields: '*',
          start: {
            sheetId: newSheetId,
            rowIndex: 0,
            columnIndex: 0
          }
        }
      });

      // Freeze first row
      requests.push({
        updateSheetProperties: {
          properties: {
            sheetId: newSheetId,
            gridProperties: {
              frozenRowCount: 1
            }
          },
          fields: 'gridProperties.frozenRowCount'
        }
      });

      // Auto resize columns
      requests.push({
        autoResizeDimensions: {
          dimensions: {
            sheetId: newSheetId,
            dimension: 'COLUMNS',
            startIndex: 0,
            endIndex: 19
          }
        }
      });

      sheetsCreated++;
      console.log(`Tab ${sheetName} created and formatted successfully!`);
    }

    if (requests.length > 0) {
      await sheets.spreadsheets.batchUpdate({
        spreadsheetId,
        requestBody: { requests }
      });
    }

    console.log("\nAll 29 sheets setup completed!");

  } catch (error) {
    console.error('Error setting up sheets:', error.message);
    process.exit(1);
  }
}

setupSheets();