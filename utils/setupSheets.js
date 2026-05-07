const { google } = require('googleapis');
require('dotenv').config();

const SHEET_NAMES = [
  "PPC", "TRA-DT3", "TRA-CPL", "PPC-ST", "PPC-ST2",
  "PPC-M/CA", "PPC-CR", "TRA-CPM", "Guardian Tax Relief", "PPC-FS",
  "FSI-PPC2"
];

const HEADERS = [
  "Date", "D/M", "Affiliate", "Campaign ID", "Link", "Step1",
  "Cake Tax Debt", "Step2", "Cake Debt Type", "Step3",
  "Cake Income", "State", "Phone", "Cake Home Phone", "Cake Lead",
  "Lead ID", "DBID", "Thank You URL", "Page Origin", "CDB",
  "CDB Email", "Neustar", "Neustar Disposition", "Pixel Fired", "Run Date"
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

    // Get all existing sheets with full properties
    const spreadsheet = await sheets.spreadsheets.get({
      spreadsheetId
    });
    const existingSheets = spreadsheet.data.sheets;

    for (const sheetName of SHEET_NAMES) {
      let sheetId;

      // Check if sheet already exists
      const existingSheet = existingSheets.find(s => s.properties.title === sheetName);
      
      if (existingSheet) {
        sheetId = existingSheet.properties.sheetId;
        console.log(`Tab ${sheetName} already exists, updating headers...`);
      } else {
        console.log(`Creating tab: ${sheetName}...`);
        
        // Create new sheet
        const createResponse = await sheets.spreadsheets.batchUpdate({
          spreadsheetId,
          requestBody: {
            requests: [{
              addSheet: {
                properties: {
                  title: sheetName,
                  index: SHEET_NAMES.indexOf(sheetName)
                }
              }
            }]
          }
        });

        // Get actual sheetId from Google response
        sheetId = createResponse.data.replies[0].addSheet.properties.sheetId;
      }

      // Perform ALL formatting in ONE single batch request
      const requests = [
        // Write headers with proper blue background and white bold text
        {
          updateCells: {
            range: {
              sheetId: sheetId,
              startRowIndex: 0,
              endRowIndex: 1,
              startColumnIndex: 0,
              endColumnIndex: 25
            },
            rows: [{
              values: HEADERS.map(header => ({
                userEnteredValue: { stringValue: header },
                userEnteredFormat: {
                  backgroundColor: { red: 0.058, green: 0.141, blue: 0.239 },
                  textFormat: {
                    foregroundColor: { red: 1, green: 1, blue: 1 },
                    bold: true,
                    fontSize: 11
                  },
                  horizontalAlignment: "CENTER",
                  verticalAlignment: "MIDDLE",
                  borders: {
                    top: { style: "SOLID", color: { red: 1, green: 1, blue: 1 } },
                    bottom: { style: "SOLID", color: { red: 1, green: 1, blue: 1 } },
                    left: { style: "SOLID", color: { red: 1, green: 1, blue: 1 } },
                    right: { style: "SOLID", color: { red: 1, green: 1, blue: 1 } }
                  }
                }
              }))
            }],
            fields: 'userEnteredValue,userEnteredFormat'
          }
        },

        // Freeze first header row
        {
          updateSheetProperties: {
            properties: {
              sheetId: sheetId,
              gridProperties: {
                frozenRowCount: 1
              }
            },
            fields: 'gridProperties.frozenRowCount'
          }
        },

        // Auto resize all columns to fit header text
        {
          autoResizeDimensions: {
            dimensions: {
              sheetId: sheetId,
              dimension: 'COLUMNS',
              startIndex: 0,
              endIndex: 25
            }
          }
        },

        // ZEBRA STRIPING - Alternating row colors
        {
          addConditionalFormatRule: {
            rule: {
              ranges: [{
                sheetId: sheetId,
                startRowIndex: 1,
                startColumnIndex: 0,
                endColumnIndex: 25
              }],
              booleanRule: {
                condition: {
                  type: 'CUSTOM_FORMULA',
                  values: [{ userEnteredValue: '=ISODD(ROW())' }]
                },
                format: {
                  backgroundColor: { red: 0.95, green: 0.97, blue: 0.99 }
                }
              }
            },
            index: 0
          }
        }
      ];

      // Execute all operations in single batch
      await sheets.spreadsheets.batchUpdate({
        spreadsheetId,
        requestBody: { requests }
      });

      console.log(`✅ Tab ${sheetName} setup completed!`);
    }

    console.log("\n🎉 All 29 sheets successfully configured with 25 columns!");

  } catch (error) {
    console.error('Error setting up sheets:', error.message);
    if (error.response) {
      console.error('API Error Details:', JSON.stringify(error.response.data, null, 2));
    }
    process.exit(1);
  }
}

setupSheets();