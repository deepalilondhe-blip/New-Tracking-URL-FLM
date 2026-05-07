const { google } = require('googleapis');
require('dotenv').config();

async function authenticate() {
  const auth = new google.auth.GoogleAuth({
    keyFile: process.env.GOOGLE_SERVICE_ACCOUNT_FILE,
    scopes: ['https://www.googleapis.com/auth/spreadsheets']
  });
  return auth.getClient();
}

async function appendRowByHeader(sheetName, rowData) {
  try {
    const client = await authenticate();
    const sheets = google.sheets({ version: 'v4', auth: client });

    // ==================================================
    // 🔹 AUTO CREATE SHEET + HEADERS IF NOT EXISTS
    // ==================================================
    let sheetExists = true;
    try {
      // Check if sheet exists and retrieve headers
      const res = await sheets.spreadsheets.values.get({
        spreadsheetId: process.env.GOOGLE_SHEET_ID,
        range: `${sheetName}!A1:V1`
      });
      const headersRow = res.data.values && res.data.values[0] ? res.data.values[0] : [];
      if (headersRow.length > 0 && !headersRow.includes("Step 1")) {
        console.log(`📋 Existing sheet ${sheetName} is missing "Step 1" column. Upgrading headers row...`);
        const fullHeaders = [
          "DateTime", "Type", "Affiliate", "Campaign ID", "Tracking Link",
          "Slider Amount", "Cake Income", "State", "Phone", "Lead ID",
          "DBID", "Page Origin", "Thank u URL", "CDB Status", "CDB Email",
          "Neustar", "Neustar Disposition", "Pixel Fired", "Run Date",
          "Step 1", "Step 2", "Step 3"
        ];
        await sheets.spreadsheets.values.update({
          spreadsheetId: process.env.GOOGLE_SHEET_ID,
          range: `${sheetName}!A1:V1`,
          valueInputOption: 'USER_ENTERED',
          requestBody: {
            values: [fullHeaders]
          }
        });
        console.log(`✅ Sheet headers successfully upgraded for ${sheetName}`);
      }
    } catch (e) {
      sheetExists = false;
    }

    if (!sheetExists) {
      // Sheet does not exist - create it with proper headers
      console.log(`📋 Creating new sheet: ${sheetName}`);

      // First create the sheet tab
      await sheets.spreadsheets.batchUpdate({
        spreadsheetId: process.env.GOOGLE_SHEET_ID,
        requestBody: {
          requests: [{
            addSheet: {
              properties: {
                title: sheetName,
                gridProperties: {
                  rowCount: 1000,
                  columnCount: 25
                }
              }
            }
          }]
        }
      });

      // Add header row
      const headers = [
        "DateTime", "Type", "Affiliate", "Campaign ID", "Tracking Link",
        "Slider Amount", "Cake Income", "State", "Phone", "Lead ID",
        "DBID", "Page Origin", "Thank u URL", "CDB Status", "CDB Email",
        "Neustar", "Neustar Disposition", "Pixel Fired", "Run Date",
        "Step 1", "Step 2", "Step 3"
      ];

      await sheets.spreadsheets.values.update({
        spreadsheetId: process.env.GOOGLE_SHEET_ID,
        range: `${sheetName}!A1:V1`,
        valueInputOption: 'USER_ENTERED',
        requestBody: {
          values: [headers]
        }
      });

      console.log(`✅ Headers created for sheet: ${sheetName}`);
    }

    const formattedRow = [
      rowData.dateTime,
      rowData.type || 'D',
      rowData.affiliate,
      rowData.campaignId,
      `=HYPERLINK("${rowData.trackingLink}", "Open Tracking")`,
      rowData.sliderAmount,
      rowData.cakeIncome,
      rowData.state,
      rowData.phone,
      rowData.leadId,
      rowData.dbid,
      `=HYPERLINK("${rowData.pageOrigin}", "View Redirect")`,
      `=HYPERLINK("${rowData.thankYouUrl}", "View ThankURL")`,
      rowData.cdbStatus,
      rowData.cdbEmail,
      rowData.neustar,
      rowData.neustarDisposition,
      rowData.pixelFired,
      rowData.runDate,
      rowData.step1 || 'N/A',
      rowData.step2 || 'N/A',
      rowData.step3 || 'N/A'
    ];

    const response = await sheets.spreadsheets.values.append({
      spreadsheetId: process.env.GOOGLE_SHEET_ID,
      range: `${sheetName}!A:V`,
      valueInputOption: 'USER_ENTERED',
      requestBody: {
        values: [formattedRow]
      }
    });

    console.log(`✅ Row appended successfully to sheet: ${sheetName}`);

    // ==================================================
    // 🔹 APPLY FULL PROFESSIONAL FORMATTING (FOR ALL SHEETS - NEW + EXISTING)
    // ==================================================
    const spreadsheet = await sheets.spreadsheets.get({ spreadsheetId: process.env.GOOGLE_SHEET_ID });
    const sheetId = spreadsheet.data.sheets.find(s => s.properties.title === sheetName).properties.sheetId;

    await sheets.spreadsheets.batchUpdate({
      spreadsheetId: process.env.GOOGLE_SHEET_ID,
      requestBody: {
        requests: [
          // ✅ 1. Reset Data Cells to White Background + Black Text (Clearing any inherited header formats)
          {
            repeatCell: {
              range: { sheetId, startRowIndex: 1, endRowIndex: 1000, startColumnIndex: 0, endColumnIndex: 22 },
              cell: {
                userEnteredFormat: {
                  backgroundColor: { red: 1, green: 1, blue: 1 },
                  textFormat: {
                    foregroundColor: { red: 0, green: 0, blue: 0 },
                    bold: false,
                    fontSize: 10
                  },
                  horizontalAlignment: 'CENTER',
                  verticalAlignment: 'MIDDLE'
                }
              },
              fields: 'userEnteredFormat(backgroundColor,textFormat,horizontalAlignment,verticalAlignment)'
            }
          },

          // ✅ 2. Header Row Styling (Dark Navy Blue + White Bold Text)
          {
            repeatCell: {
              range: { sheetId, startRowIndex: 0, endRowIndex: 1, startColumnIndex: 0, endColumnIndex: 22 },
              cell: {
                userEnteredFormat: {
                  backgroundColor: { red: 0, green: 0.125, blue: 0.376 },
                  textFormat: {
                    foregroundColor: { red: 1, green: 1, blue: 1 },
                    bold: true
                  }
                }
              },
              fields: 'userEnteredFormat(backgroundColor,textFormat)'
            }
          },

          // ✅ 3. Zebra Striping Pattern (Light Blue even rows)
          {
            addConditionalFormatRule: {
              rule: {
                ranges: [{
                  sheetId,
                  startRowIndex: 1,
                  endRowIndex: 999,
                  startColumnIndex: 0,
                  endColumnIndex: 22
                }],
                booleanRule: {
                  condition: {
                    type: 'CUSTOM_FORMULA',
                    values: [{ userEnteredValue: '=ISEVEN(ROW())' }]
                  },
                  format: {
                    backgroundColor: {
                      red: 0.91,
                      green: 0.94,
                      blue: 0.996
                    }
                  }
                }
              },
              index: 0
            }
          },

          // ✅ 3. Center alignment and Font size for the entire sheet
          {
            repeatCell: {
              range: { sheetId, startRowIndex: 0, endRowIndex: 1000, startColumnIndex: 0, endColumnIndex: 22 },
              cell: {
                userEnteredFormat: {
                  horizontalAlignment: 'CENTER',
                  verticalAlignment: 'MIDDLE',
                  textFormat: { fontSize: 10 }
                }
              },
              fields: 'userEnteredFormat(horizontalAlignment,verticalAlignment,textFormat.fontSize)'
            }
          },

          // ✅ 4. Set Column Widths
          { updateDimensionProperties: { range: { sheetId, dimension: 'COLUMNS', startIndex: 0, endIndex: 22 }, properties: { pixelSize: 140 }, fields: 'pixelSize' } },
          { updateDimensionProperties: { range: { sheetId, dimension: 'COLUMNS', startIndex: 11, endIndex: 12 }, properties: { pixelSize: 240 }, fields: 'pixelSize' } }, // Thank u URL
          { updateDimensionProperties: { range: { sheetId, dimension: 'COLUMNS', startIndex: 12, endIndex: 13 }, properties: { pixelSize: 320 }, fields: 'pixelSize' } }  // Page Origin
        ]
      }
    });

    console.log(`✨ Professional formatting applied to ${sheetName}`);
    return true;
  } catch (error) {
    console.error('❌ Google Sheets Error:', error.message);
    return false;
  }
}

module.exports = {
  appendRowByHeader
};