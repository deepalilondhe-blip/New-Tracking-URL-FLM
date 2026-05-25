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
          "DateTime", "Type", "Affiliate", "Campaign ID", "Link",
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
      console.log(`🆕 Sheet "${sheetName}" not found. Creating new sheet with standard headers...`);
      // Create new sheet
      await sheets.spreadsheets.batchUpdate({
        spreadsheetId: process.env.GOOGLE_SHEET_ID,
        requestBody: {
          requests: [{
            addSheet: {
              properties: {
                title: sheetName,
                gridProperties: {
                  rowCount: 1000,
                  columnCount: 22,
                  frozenRowCount: 1
                }
              }
            }
          }]
        }
      });

      // Add Headers
      const fullHeaders = [
        "DateTime", "Type", "Affiliate", "Campaign ID", "Link",
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
      console.log(`✅ New sheet "${sheetName}" successfully created and initialized.`);
    }

    const formattedRow = [
      rowData.dateTime,
      rowData.type || 'D',
      rowData.affiliate,
      rowData.campaignId,
      rowData.trackingLink ? `=HYPERLINK("${rowData.trackingLink}", "Open Tracking")` : '',
      rowData.sliderAmount,
      rowData.cakeIncome,
      rowData.state,
      rowData.phone,
      rowData.leadId,
      rowData.dbid,
      rowData.pageOrigin ? `=HYPERLINK("${rowData.pageOrigin}", "View Page Origin")` : '',
      rowData.thankYouUrl ? `=HYPERLINK("${rowData.thankYouUrl}", "ViewThankYou URL")` : '',
      rowData.cdbStatus,
      rowData.cdbEmail,
      rowData.neustar,
      rowData.neustarDisposition,
      rowData.pixelFired,
      rowData.runDate,
      rowData.step1 || '',
      rowData.step2 || '',
      rowData.step3 || ''
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
    try {
      const spreadsheet = await sheets.spreadsheets.get({ spreadsheetId: process.env.GOOGLE_SHEET_ID });
      const sheetId = spreadsheet.data.sheets.find(s => s.properties.title === sheetName).properties.sheetId;

      await sheets.spreadsheets.batchUpdate({
        spreadsheetId: process.env.GOOGLE_SHEET_ID,
        requestBody: {
          requests: [
            // ✅ 1. Reset Data Cells to White Background + Black Text
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

            // ✅ 3. Zebra Lines (Alternating Row Colors) - Wrapped in separate try if needed, but we wrap the whole batch
            {
              addBanding: {
                bandedRange: {
                  range: {
                    sheetId,
                    startRowIndex: 0,
                    endRowIndex: 1000,
                    startColumnIndex: 0,
                    endColumnIndex: 22
                  },
                  rowProperties: {
                    headerColor: { red: 0, green: 0.125, blue: 0.376 },
                    firstBandColor: { red: 1, green: 1, blue: 1 },
                    secondBandColor: { red: 0.96, green: 0.96, blue: 0.96 }
                  }
                }
              }
            },
            // ... (rest of requests continue)

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

          // ✅ 4. Hyperlink Text Color and Underline Styling (Explicit Blue color + Underline for Link columns)
          {
            repeatCell: {
              range: { sheetId, startRowIndex: 1, endRowIndex: 1000, startColumnIndex: 4, endColumnIndex: 5 },
              cell: {
                userEnteredFormat: {
                  textFormat: {
                    foregroundColor: { red: 0.062, green: 0.353, blue: 0.824 },
                    underline: true,
                    fontSize: 10
                  },
                  numberFormat: {
                    type: 'NUMBER',
                    pattern: ''
                  }
                }
              },
              fields: 'userEnteredFormat(textFormat,numberFormat)'
            }
          },
          {
            repeatCell: {
              range: { sheetId, startRowIndex: 1, endRowIndex: 1000, startColumnIndex: 11, endColumnIndex: 13 },
              cell: {
                userEnteredFormat: {
                  textFormat: {
                    foregroundColor: { red: 0.062, green: 0.353, blue: 0.824 },
                    underline: true,
                    fontSize: 10
                  },
                  numberFormat: {
                    type: 'NUMBER',
                    pattern: ''
                  }
                }
              },
              fields: 'userEnteredFormat(textFormat,numberFormat)'
            }
          },

          // ✅ 5. Set Column Widths
          { updateDimensionProperties: { range: { sheetId, dimension: 'COLUMNS', startIndex: 0, endIndex: 22 }, properties: { pixelSize: 140 }, fields: 'pixelSize' } },
          { updateDimensionProperties: { range: { sheetId, dimension: 'COLUMNS', startIndex: 4, endIndex: 5 }, properties: { pixelSize: 180 }, fields: 'pixelSize' } }, // Link column
          { updateDimensionProperties: { range: { sheetId, dimension: 'COLUMNS', startIndex: 11, endIndex: 12 }, properties: { pixelSize: 240 }, fields: 'pixelSize' } }, // Thank u URL
          { updateDimensionProperties: { range: { sheetId, dimension: 'COLUMNS', startIndex: 12, endIndex: 13 }, properties: { pixelSize: 320 }, fields: 'pixelSize' } }  // Page Origin
        ]
      }
    });

    console.log(`✨ Professional formatting applied to ${sheetName}`);
    } catch (fmtError) {
      console.log(`⚠️  Non-fatal formatting error for ${sheetName} (Banding might already exist):`, fmtError.message);
    }
    return true;
  } catch (error) {
    console.error('❌ Critical Google Sheets Error:', error.message);
    return false;
  }
}

/**
 * 📊 [FLM Agent] LIVE DASHBOARD UPDATER
 * Updates the 'SUMMARY' sheet with a color-coded status matrix.
 */
async function updateSummaryDashboard(campaignName, environmentLabel, status) {
  try {
    const client = await authenticate();
    const sheets = google.sheets({ version: 'v4', auth: client });
    const spreadsheetId = process.env.GOOGLE_SHEET_ID;
    const sheetName = 'SUMMARY';

    // 1. Ensure SUMMARY sheet exists with correct headers
    const environments = [
      'Android - Chrome', 'Android - Firefox', 'iOS - Chrome', 'iOS - Safari',
      'Tablet - Safari', 'Tablet - Chrome', 'Windows - Chrome', 'Windows - Firefox',
      'MAC - Safari', 'MAC - Chrome'
    ];

    let summaryData;
    try {
      const res = await sheets.spreadsheets.values.get({ spreadsheetId, range: `${sheetName}!A:L` });
      summaryData = res.data.values || [];
    } catch (e) {
      // Create sheet if missing
      await sheets.spreadsheets.batchUpdate({
        spreadsheetId,
        requestBody: { requests: [{ addSheet: { properties: { title: sheetName } } }] }
      }).catch(() => {});
      summaryData = [];
    }

    if (summaryData.length === 0) {
      const headers = ['Campaign \\ Environment', ...environments];
      await sheets.spreadsheets.values.update({
        spreadsheetId, range: `${sheetName}!A1`,
        valueInputOption: 'USER_ENTERED', requestBody: { values: [headers] }
      });
      summaryData = [headers];
    }

    // 2. Find or create row for the campaign
    let rowIndex = summaryData.findIndex(row => row[0] === campaignName);
    if (rowIndex === -1) {
      rowIndex = summaryData.length;
      await sheets.spreadsheets.values.update({
        spreadsheetId, range: `${sheetName}!A${rowIndex + 1}`,
        valueInputOption: 'USER_ENTERED', requestBody: { values: [[campaignName]] }
      });
    }

    // 3. Find column for the environment
    const colIndex = environments.indexOf(environmentLabel);
    if (colIndex === -1) return; // Invalid environment

    const cellRange = `${sheetName}!${String.fromCharCode(66 + colIndex)}${rowIndex + 1}`;
    const timestamp = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    const cellValue = status === 'PASS' ? `✅ PASS (${timestamp})` : `❌ FAIL (${timestamp})`;

    await sheets.spreadsheets.values.update({
      spreadsheetId, range: cellRange,
      valueInputOption: 'USER_ENTERED', requestBody: { values: [[cellValue]] }
    });

    console.log(`📊 [FLM Agent] Dashboard updated: ${campaignName} [${environmentLabel}] -> ${status}`);
  } catch (error) {
    console.warn('⚠️ [FLM Agent] Dashboard update failed:', error.message);
  }
}

module.exports = {
  appendRowByHeader,
  updateSummaryDashboard
};