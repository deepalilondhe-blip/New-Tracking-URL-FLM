const { google } = require('googleapis');
require('dotenv').config();

const sheetCache = {
  initialized: {}, // sheetName -> true
  ids: {}          // sheetName -> sheetId
};

async function authenticate() {
  const auth = new google.auth.GoogleAuth({
    keyFile: process.env.GOOGLE_SERVICE_ACCOUNT_FILE,
    scopes: ['https://www.googleapis.com/auth/spreadsheets', 'https://www.googleapis.com/auth/drive']
  });
  return auth.getClient();
}

async function appendRowByHeader(sheetName, rowData) {
  try {
    const client = await authenticate();
    const sheets = google.sheets({ version: 'v4', auth: client });
    const spreadsheetId = process.env.GOOGLE_SHEET_ID;

    // Normalize sheetName for checking in cache
    const normalizedSheetName = sheetName.trim();

    // ==================================================
    // 🔹 AUTO CREATE SHEET + HEADERS IF NOT EXISTS (RUN ONCE PER SESSION/SHEET)
    // ==================================================
    if (!sheetCache.initialized[normalizedSheetName]) {
      let sheetExists = true;
      try {
        // Check if sheet exists and retrieve headers
        const res = await sheets.spreadsheets.values.get({
          spreadsheetId,
          range: `${sheetName}!A1:V1`
        });
        const headersRow = res.data.values && res.data.values[0] ? res.data.values[0] : [];
        if (headersRow.length > 0 && !headersRow.includes("Step 1")) {
          console.log(`📋 Existing sheet ${sheetName} is missing "Step 1" column. Upgrading headers row...`);
        const fullHeaders = [
          "DateTime", "Type", "Affiliate", "Campaign ID", "Link",
          "Slider Amount", "Cake Income", "State", "Phone", "Lead ID",
          "DBID", "Page Origin", "Thank U URL", "CDB Status", "CDB Email",
          "Neustar", "Neustar Disposition", "Pixel Fired", "Tax Debt",
          "Step 1", "Step 2", "Step 3", "Step 4", "Step 5", "Step 6", "Step 7", "Step 8", "Step 9", "Step 10"
        ];
          await sheets.spreadsheets.values.update({
            spreadsheetId,
            range: `${sheetName}!A1:AC1`,
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
          spreadsheetId,
          requestBody: {
            requests: [{
              addSheet: {
                properties: {
                  title: sheetName,
                  gridProperties: {
                    rowCount: 1000,
                    columnCount: 29,
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
          "DBID", "Page Origin", "Thank U URL", "CDB Status", "CDB Email",
          "Neustar", "Neustar Disposition", "Pixel Fired", "Tax Debt",
          "Step 1", "Step 2", "Step 3", "Step 4", "Step 5", "Step 6", "Step 7", "Step 8", "Step 9", "Step 10"
        ];
        await sheets.spreadsheets.values.update({
          spreadsheetId,
          range: `${sheetName}!A1:AC1`,
          valueInputOption: 'USER_ENTERED',
          requestBody: {
            values: [fullHeaders]
          }
        });
        console.log(`✅ New sheet "${sheetName}" successfully created and initialized.`);
        
        // ✅ Fetch spreadsheet metadata first
        const spreadsheet = await sheets.spreadsheets.get({ spreadsheetId });
        
        // ✅ Apply Header Colors and Zebra Striping for new sheets
        const newSheetId = spreadsheet.data.sheets.find(s => s.properties.title.trim() === normalizedSheetName).properties.sheetId;
        
        await sheets.spreadsheets.batchUpdate({
          spreadsheetId,
          requestBody: {
            requests: [
              // ✅ Header Row Navy Blue Background + White Bold Text
              {
                repeatCell: {
                  range: { sheetId: newSheetId, startRowIndex: 0, endRowIndex: 1, startColumnIndex: 0, endColumnIndex: 29 },
                  cell: {
                    userEnteredFormat: {
                      backgroundColor: { red: 0, green: 0, blue: 128/255 },
                      textFormat: { foregroundColor: { red: 1, green: 1, blue: 1 }, bold: true, fontSize: 11 },
                      horizontalAlignment: 'CENTER',
                      verticalAlignment: 'MIDDLE'
                    }
                  },
                  fields: 'userEnteredFormat(backgroundColor,textFormat,horizontalAlignment,verticalAlignment)'
                }
              },
              // ✅ Auto Zebra Striping for first 1000 rows (Even rows = Light Blue #E8F0FE)
              {
                addConditionalFormatRule: {
                  rule: {
                    ranges: [{ sheetId: newSheetId, startRowIndex: 1, endRowIndex: 1000, startColumnIndex: 0, endColumnIndex: 29 }],
                    booleanRule: {
                      condition: {
                        type: 'CUSTOM_FORMULA',
                        values: [{ userEnteredValue: '=ISEVEN(ROW())' }]
                      },
                      format: {
                        backgroundColor: { red: 232/255, green: 240/255, blue: 254/255 }
                      }
                    }
                  },
                  index: 0
                }
              },
              // ✅ Column Widths (Standard 140px, specific larger)
              { updateDimensionProperties: { range: { sheetId: newSheetId, dimension: 'COLUMNS', startIndex: 0, endIndex: 29 }, properties: { pixelSize: 140 }, fields: 'pixelSize' } },
              { updateDimensionProperties: { range: { sheetId: newSheetId, dimension: 'COLUMNS', startIndex: 4, endIndex: 5 }, properties: { pixelSize: 180 }, fields: 'pixelSize' } },
              { updateDimensionProperties: { range: { sheetId: newSheetId, dimension: 'COLUMNS', startIndex: 11, endIndex: 12 }, properties: { pixelSize: 320 }, fields: 'pixelSize' } },
              { updateDimensionProperties: { range: { sheetId: newSheetId, dimension: 'COLUMNS', startIndex: 12, endIndex: 13 }, properties: { pixelSize: 240 }, fields: 'pixelSize' } },
              // ✅ Set sheet view direction to Left-To-Right (LTR)
              { updateSheetProperties: { properties: { sheetId: newSheetId, rightToLeft: false }, fields: 'rightToLeft' } }
            ]
          }
        });
        
        console.log(`✅ Header colors and zebra striping applied to new sheet "${sheetName}"`);
      }

      // Fetch spreadsheet metadata to populate all sheet IDs in the cache
      const spreadsheet = await sheets.spreadsheets.get({ spreadsheetId });
      spreadsheet.data.sheets.forEach(s => {
        sheetCache.ids[s.properties.title.trim()] = s.properties.sheetId;
      });
      sheetCache.initialized[normalizedSheetName] = true;
    }

    // Removed makeHyperlink to use native updateCells links instead

    const formattedRow = [
      rowData.dateTime,
      rowData.type || 'D',
      rowData.affiliate,
      rowData.campaignId,
      rowData.trackingLink, // Will be overwritten by native link
      rowData.sliderAmount,
      rowData.cakeIncome,
      rowData.state,
      rowData.phone,
      rowData.leadId,
      rowData.dbid,
      rowData.pageOrigin, // Will be overwritten
      rowData.thankYouUrl, // Will be overwritten
      // Normalize CDB Status to uppercase TRUE/FALSE
      rowData.cdbStatus ? String(rowData.cdbStatus).toUpperCase() : 'FALSE',
      rowData.cdbEmail,
      rowData.neustar,
      rowData.neustarDisposition,
      rowData.pixelFired,
      rowData.taxDebt || '',
      // ✅ Step columns — option text clicked at each questionnaire/choice step
      rowData.step1 || '',
      rowData.step2 || '',
      rowData.step3 || '',
      rowData.step4 || '',
      rowData.step5 || '',
      rowData.step6 || '',
      rowData.step7 || '',
      rowData.step8 || '',
      rowData.step9 || '',
      rowData.step10 || ''
    ];


    const response = await sheets.spreadsheets.values.append({
      spreadsheetId,
      range: `${sheetName}!A:AC`,
      valueInputOption: 'USER_ENTERED',
      requestBody: {
        values: [formattedRow]
      }
    });

    console.log(`✅ Row appended successfully to sheet: ${sheetName}`);

    // ==================================================
    // 🔹 APPLY FAST FORMATTING ONLY TO THE NEW ROW
    // ==================================================
    try {
      const sheetId = sheetCache.ids[normalizedSheetName];
      const updatedRange = response.data.updates?.updatedRange || '';
      const match = updatedRange.match(/A(\d+):/);
      const rowIndex = match ? parseInt(match[1], 10) - 1 : null; // 0-based index

      if (sheetId !== undefined && rowIndex !== null) {
        await sheets.spreadsheets.batchUpdate({
          spreadsheetId,
          requestBody: {
            requests: [
              // ✅ 1. Format the newly appended row (Alignment and font, NO background color to preserve Zebra)
              {
                repeatCell: {
                  range: { sheetId, startRowIndex: rowIndex, endRowIndex: rowIndex + 1, startColumnIndex: 0, endColumnIndex: 29 },
                  cell: {
                    userEnteredFormat: {
                      textFormat: {
                        foregroundColor: { red: 0, green: 0, blue: 0 },
                        bold: false,
                        fontSize: 10
                      },
                      horizontalAlignment: 'CENTER',
                      verticalAlignment: 'MIDDLE'
                    }
                  },
                  fields: 'userEnteredFormat(textFormat,horizontalAlignment,verticalAlignment)'
                }
              },
              // ✅ 1.5. Explicitly format Column A (DateTime) so it displays as M-D-YYYY HH:mm:ss
              {
                repeatCell: {
                  range: { sheetId, startRowIndex: rowIndex, endRowIndex: rowIndex + 1, startColumnIndex: 0, endColumnIndex: 1 },
                  cell: {
                    userEnteredFormat: {
                        numberFormat: {
                          type: 'DATE_TIME',
                          pattern: 'd/M/yyyy H:mm:ss'
                        }
                    }
                  },
                  fields: 'userEnteredFormat.numberFormat'
                }
              }
            ]
          }
        });

        // ✅ 3. Convert all URLs to Native Links (No formulas!)
        const linkRequests = [];
        function addLinkRequest(colIndex, url, displayText) {
           let targetUrl = String(url || '').trim();
           if (!targetUrl) {
             linkRequests.push({
               updateCells: {
                 range: { sheetId, startRowIndex: rowIndex, endRowIndex: rowIndex + 1, startColumnIndex: colIndex, endColumnIndex: colIndex + 1 },
                 rows: [{ values: [{ userEnteredValue: { stringValue: '' } }] }],
                 fields: 'userEnteredValue'
               }
             });
             return;
           }

           if (!targetUrl.startsWith('http://') && !targetUrl.startsWith('https://')) {
             targetUrl = 'https://' + targetUrl;
           }

           linkRequests.push({
             updateCells: {
               range: { sheetId, startRowIndex: rowIndex, endRowIndex: rowIndex + 1, startColumnIndex: colIndex, endColumnIndex: colIndex + 1 },
               rows: [{
                 values: [{
                   userEnteredValue: { stringValue: displayText },
                   userEnteredFormat: {
                     textFormat: {
                       link: { uri: targetUrl },
                       foregroundColor: { red: 0.062, green: 0.353, blue: 0.824 },
                       underline: true,
                       fontSize: 10
                     }
                   }
                 }]
               }],
               fields: 'userEnteredValue,userEnteredFormat.textFormat'
             }
           });
         }

        addLinkRequest(4, rowData.trackingLink, "Open Tracking");
        addLinkRequest(11, rowData.pageOrigin, "View Page Origin");
        addLinkRequest(12, rowData.thankYouUrl, "ViewThankURL");

        if (linkRequests.length > 0) {
          await sheets.spreadsheets.batchUpdate({
            spreadsheetId,
            requestBody: { requests: linkRequests }
          });
        }

        console.log(`✨ Fast formatting & Native Links applied to newly appended row ${rowIndex + 1} of ${sheetName}`);
      }
    } catch (fmtError) {
      console.log(`⚠️ Non-fatal row formatting error for ${sheetName}:`, fmtError.message);
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

const FINAL_SPREADSHEET_ID = '1fO1YFFIM-i_DRPLqdSqC4oECeAHEETPJmN6RWlTrLzU';

async function appendFinalValidationRow(rowData) {
  try {
    const client = await authenticate();
    const sheets = google.sheets({ version: 'v4', auth: client });
    
    // Default sheet name when a user creates a new Google Spreadsheet
    const sheetName = 'Sheet1';

    let sheetExists = true;
    try {
      const res = await sheets.spreadsheets.values.get({
        spreadsheetId: FINAL_SPREADSHEET_ID,
        range: `${sheetName}!A1:M1`
      });
      const headersRow = res.data.values && res.data.values[0] ? res.data.values[0] : [];
      if (headersRow.length < 13 || headersRow[0] !== "Page URL") {
        sheetExists = false; // Need to create or update headers
      }
    } catch (e) {
      console.warn("⚠️ Could not read Sheet1. Error:", e.message);
      sheetExists = false;
    }

    const spreadsheet = await sheets.spreadsheets.get({ spreadsheetId: FINAL_SPREADSHEET_ID });
    const sheetMetadata = spreadsheet.data.sheets.find(s => s.properties.title === sheetName);
    const sheetId = sheetMetadata ? sheetMetadata.properties.sheetId : 0;

    // Initialize Headers if they don't exist
    if (!sheetExists) {
      console.log(`🆕 Initializing 13 headers and styling in "${sheetName}"...`);
      
      const fullHeaders = [
        "Page URL", "Lead ID", "In Cake", "In CDB", "IS Test", 
        "Pixel Fired", "Affiliate", "Tax Debt", "Neustar", "Neustar Disposition", 
        "DBID", "Date", "Note"
      ];
      
      // Add Headers
      await sheets.spreadsheets.values.update({
        spreadsheetId: FINAL_SPREADSHEET_ID,
        range: `${sheetName}!A1:M1`,
        valueInputOption: 'USER_ENTERED',
        requestBody: { values: [fullHeaders] }
      });

      // Clear out the 14th column (N) if it exists, to clean up old headers
      await sheets.spreadsheets.values.clear({
        spreadsheetId: FINAL_SPREADSHEET_ID,
        range: `${sheetName}!N1:Z`
      });

      // Apply initial header styling
      await sheets.spreadsheets.batchUpdate({
        spreadsheetId: FINAL_SPREADSHEET_ID,
        requestBody: {
          requests: [
            {
              repeatCell: {
                range: { sheetId, startRowIndex: 0, endRowIndex: 1, startColumnIndex: 0, endColumnIndex: 13 },
                cell: {
                  userEnteredFormat: {
                    backgroundColor: { red: 0, green: 0.125, blue: 0.376 },
                    textFormat: { foregroundColor: { red: 1, green: 1, blue: 1 }, bold: true, fontSize: 11 },
                    horizontalAlignment: 'CENTER',
                    verticalAlignment: 'MIDDLE'
                  }
                },
                fields: 'userEnteredFormat(backgroundColor,textFormat,horizontalAlignment,verticalAlignment)'
              }
            },
            { updateDimensionProperties: { range: { sheetId, dimension: 'COLUMNS', startIndex: 0, endIndex: 1 }, properties: { pixelSize: 320 }, fields: 'pixelSize' } }, // Page URL
            { updateDimensionProperties: { range: { sheetId, dimension: 'COLUMNS', startIndex: 1, endIndex: 11 }, properties: { pixelSize: 150 }, fields: 'pixelSize' } },
            { updateDimensionProperties: { range: { sheetId, dimension: 'COLUMNS', startIndex: 11, endIndex: 12 }, properties: { pixelSize: 200 }, fields: 'pixelSize' } }, // Date
            { updateDimensionProperties: { range: { sheetId, dimension: 'COLUMNS', startIndex: 12, endIndex: 13 }, properties: { pixelSize: 280 }, fields: 'pixelSize' } } // Note
          ]
        }
      });
      console.log(`✅ Headers and styling initialized successfully.`);
    }

   function cleanVal(val) {
  return val ? String(val).trim() : '';
}

      const currentDateTime = new Date().toISOString();
      let affiliate = cleanVal(rowData.affiliate);
      // Ensure affiliate is a non‑null string (empty string if missing)
      if (!affiliate) affiliate = '';
      // Use the note value passed from the validation script
      // If affiliate is "QA affiliate" → note is empty; otherwise → "Real Affiliate"
      let finalNote = cleanVal(rowData.note);

    const formattedRow = [
      cleanVal(rowData.pageUrl) ? `=HYPERLINK("${cleanVal(rowData.pageUrl)}","Open Link")` : '',
      cleanVal(rowData.leadId),
      cleanVal(rowData.inCake),
      cleanVal(rowData.inCdb),
      cleanVal(rowData.isTest),
      cleanVal(rowData.pixelFired),
      affiliate,
      cleanVal(rowData.taxDebt),
      cleanVal(rowData.neustar),
      cleanVal(rowData.neustarDisposition),
      cleanVal(rowData.dbid),
      currentDateTime,
      finalNote
    ];

    // Get current number of rows (including header) to determine insertion point
    const existingRowsRes = await sheets.spreadsheets.values.get({
      spreadsheetId: FINAL_SPREADSHEET_ID,
      range: `${sheetName}!A:A`
    });
    const existingRows = existingRowsRes.data.values ? existingRowsRes.data.values.length : 0;
    const insertRowIndex = existingRows; // 0‑based index where new row will be inserted after existing rows

    // Insert a new blank row at the desired position
    await sheets.spreadsheets.batchUpdate({
      spreadsheetId: FINAL_SPREADSHEET_ID,
      requestBody: {
        requests: [{
          insertDimension: {
            range: {
              sheetId,
              dimension: 'ROWS',
              startIndex: insertRowIndex,
              endIndex: insertRowIndex + 1
            },
            inheritFromBefore: true
          }
        }]
      }
    });

    // Write the new row values into the inserted row
    await sheets.spreadsheets.values.update({
      spreadsheetId: FINAL_SPREADSHEET_ID,
      range: `${sheetName}!A${insertRowIndex + 1}:M${insertRowIndex + 1}`,
      valueInputOption: 'USER_ENTERED',
      requestBody: { values: [formattedRow] }
    });

    const rowIndex = insertRowIndex; // used for formatting
    const requests = [];

    // Zebra striping based on row index
    const isOddRow = rowIndex % 2 === 1;
    const baseColor = isOddRow
      ? { red: 0.95, green: 0.95, blue: 0.95 }
      : { red: 1, green: 1, blue: 1 };

    requests.push({
      repeatCell: {
        range: { sheetId, startRowIndex: rowIndex, endRowIndex: rowIndex + 1, startColumnIndex: 0, endColumnIndex: 13 },
        cell: {
          userEnteredFormat: {
            backgroundColor: baseColor,
            textFormat: { foregroundColor: { red: 0, green: 0, blue: 0 }, fontSize: 10 },
            horizontalAlignment: 'CENTER',
            verticalAlignment: 'MIDDLE'
          }
        },
        fields: 'userEnteredFormat(backgroundColor,textFormat,horizontalAlignment,verticalAlignment)'
      }
    });

    // Make Page URL (Col A) explicitly a blue, underlined hyperlink
    requests.push({
      repeatCell: {
        range: { sheetId, startRowIndex: rowIndex, endRowIndex: rowIndex + 1, startColumnIndex: 0, endColumnIndex: 1 },
        cell: {
          userEnteredFormat: {
            textFormat: { foregroundColor: { red: 0.067, green: 0.333, blue: 0.8 }, underline: true, fontSize: 10 }
          }
        },
        fields: 'userEnteredFormat.textFormat'
      }
    });

    // Conditionally highlight Note column in yellow if it contains a value
    if (finalNote) {
      requests.push({
        repeatCell: {
          range: {
            sheetId,
            startRowIndex: rowIndex,
            endRowIndex: rowIndex + 1,
            startColumnIndex: 12, // Note column (M)
            endColumnIndex: 13
          },
          cell: {
            userEnteredFormat: {
              backgroundColor: { red: 1, green: 1, blue: 0 }
            }
          },
          fields: 'userEnteredFormat.backgroundColor'
        }
      });
    }

    if (requests.length > 0) {
      await sheets.spreadsheets.batchUpdate({
        spreadsheetId: FINAL_SPREADSHEET_ID,
        requestBody: { requests }
      });
    }

    console.log(`✅ Inserted and formatted row in spreadsheet!`);
    return true;

  } catch (error) {
    console.error('❌ Final Validation Sheet Error:', error.message);
    return false;
  }
}

async function appendNonTestRow(urlName, leadId, cdbStatus, allCondition) {
  try {
    const client = await authenticate();
    const sheets = google.sheets({ version: 'v4', auth: client });
    const spreadsheetId = FINAL_SPREADSHEET_ID;
    const sheetName = 'Non Test';

    // 1. Ensure sheet exists with correct headers
    let sheetExists = true;
    let needsHeaders = false;
    try {
      const response = await sheets.spreadsheets.values.get({
        spreadsheetId,
        range: `${sheetName}!A1:D1`
      });
      if (!response.data.values || response.data.values.length === 0) {
        needsHeaders = true;
      }
    } catch (e) {
      sheetExists = false;
      needsHeaders = true;
    }

    if (!sheetExists) {
      console.log(`🆕 Creating "${sheetName}" sheet tab...`);
      await sheets.spreadsheets.batchUpdate({
        spreadsheetId,
        requestBody: {
          requests: [{
            addSheet: {
              properties: {
                title: sheetName,
                gridProperties: {
                  rowCount: 1000,
                  columnCount: 4,
                  frozenRowCount: 1
                }
              }
            }
          }]
        }
      }).catch(() => {});
    }

    if (needsHeaders) {
      const headers = ["Search URL Name", "Lead ID", "CDB Status", "All Condition"];
      await sheets.spreadsheets.values.update({
        spreadsheetId,
        range: `${sheetName}!A1:D1`,
        valueInputOption: 'USER_ENTERED',
        requestBody: {
          values: [headers]
        }
      });
    }

    const formattedRow = [
      urlName,
      leadId,
      cdbStatus,
      allCondition
    ];

    await sheets.spreadsheets.values.append({
      spreadsheetId,
      range: `${sheetName}!A:D`,
      valueInputOption: 'USER_ENTERED',
      requestBody: {
        values: [formattedRow]
      }
    });

    console.log(`✅ Row appended successfully to Google Sheet: ${sheetName}`);
    return true;
  } catch (error) {
    console.error('❌ Google Sheets Non Test Tab Error:', error.message);
    return false;
  }
}

// ==================================================
// 🔹 FETCH LATEST LEAD ID FROM GOOGLE SHEETS
// ==================================================
async function getLatestLeadIdFromSheet(sheetName, spreadsheetIdOverride = null) {
  try {
    const client = await authenticate();
    const sheets = google.sheets({ version: 'v4', auth: client });
    // Use the provided spreadsheet ID or fall back to the one in .env
    const spreadsheetId = spreadsheetIdOverride || process.env.GOOGLE_SHEET_ID || '1rXIg3dMQ4APH3lHLcfWYfP45PnOAKmV9POkoSS3YWxI';

    // Fetch column J (Lead ID column) from the sheet
    const range = `${sheetName}!J:J`;
    const res = await sheets.spreadsheets.values.get({
      spreadsheetId,
      range: range
    });

    const rows = res.data.values;
    if (!rows || rows.length === 0) {
      console.warn(`[WARN] No data found in column J of sheet ${sheetName}`);
      return null;
    }

    // Iterate backwards from the bottom to find the last non-empty Lead ID
    for (let i = rows.length - 1; i >= 1; i--) {
      const val = rows[i][0];
      if (val && val.trim() !== '' && val.trim() !== 'Lead ID') {
        return val.trim();
      }
    }

    return null;
  } catch (error) {
    console.error(`[ERROR] Failed to fetch latest Lead ID from sheet ${sheetName}:`, error.message);
    return null;
  }
}

// ==================================================
// 🔹 FETCH LATEST FULL ROW FROM GOOGLE SHEETS
// ==================================================
async function getLatestLeadRowFromSheet(sheetName, spreadsheetIdOverride = null) {
  try {
    const client = await authenticate();
    const sheets = google.sheets({ version: 'v4', auth: client });
    const spreadsheetId = spreadsheetIdOverride || process.env.GOOGLE_SHEET_ID || '1rXIg3dMQ4APH3lHLcfWYfP45PnOAKmV9POkoSS3YWxI';

    // Fetch the full rows from A to Z
    const range = `${sheetName}!A:Z`;
    const res = await sheets.spreadsheets.values.get({
      spreadsheetId,
      range: range
    });

    const rows = res.data.values;
    if (!rows || rows.length === 0) {
      console.warn(`[WARN] No data found in sheet ${sheetName}`);
      return null;
    }

    // Iterate backwards to find the last valid row with a Lead ID (Index 9)
    for (let i = rows.length - 1; i >= 1; i--) {
      const row = rows[i];
      const leadId = row[9];
      if (leadId && leadId.trim() !== '' && leadId.trim() !== 'Lead ID') {
        return {
          sheetName: sheetName, // Added to track which tab it came from
          rowIndex: i + 1, // 1-indexed
          dateTime: row[0] || '',
          affiliate: row[2] || '',
          leadId: leadId.trim(),
          dbid: row[10] || '',
          pageOrigin: row[11] || '',
          thankYouUrl: row[12] || '',
          neustar: row[15] || '',
          neustarDisposition: row[16] || '',
          pixelFired: row[17] || '',
          taxDebt: row[18] || ''
        };
      }
    }
    return null;
  } catch (error) {
    console.error(`[ERROR] Failed to fetch latest row from sheet ${sheetName}:`, error.message);
    return null;
  }
}

// ==================================================
// 🔹 APPEND RAW ROW TO ANY SHEET
// ==================================================
async function appendRawRow(spreadsheetId, sheetName, rowData) {
  try {
    const client = await authenticate();
    const sheets = google.sheets({ version: 'v4', auth: client });

    await sheets.spreadsheets.values.append({
      spreadsheetId,
      range: `${sheetName}!A:L`,
      valueInputOption: 'USER_ENTERED',
      insertDataOption: 'INSERT_ROWS',
      requestBody: {
        values: [rowData]
      }
    });

    console.log(`✅ Raw row appended successfully to ${sheetName}`);
    return true;
  } catch (error) {
    console.error(`❌ Failed to append raw row to ${sheetName}:`, error.message);
    return false;
  }
}

// ==================================================
// 🔹 FETCH LATEST LEAD ACROSS ALL TABS
// ==================================================
async function getAbsoluteLatestLeadAcrossAllTabs(spreadsheetIdOverride = null) {
  try {
    const client = await authenticate();
    const sheets = google.sheets({ version: 'v4', auth: client });
    const spreadsheetId = spreadsheetIdOverride || process.env.GOOGLE_SHEET_ID || '1rXIg3dMQ4APH3lHLcfWYfP45PnOAKmV9POkoSS3YWxI';

    // 1. Get all sheet names
    const spreadsheet = await sheets.spreadsheets.get({ spreadsheetId });
    const sheetNames = spreadsheet.data.sheets.map(s => s.properties.title);
    
    let latestLead = null;
    let latestDate = 0;

    // 2. Loop through all sheets and get the latest lead from each
    for (const sheetName of sheetNames) {
      // Skip hidden or config tabs if any, but search all data tabs
      const leadData = await getLatestLeadRowFromSheet(sheetName, spreadsheetId);
      if (leadData && leadData.dateTime) {
        // Parse dateTime (assume standard format like "MM/DD/YYYY HH:MM:SS" or similar)
        // If the date string is poorly formatted, new Date() might result in NaN, so we handle it
        const timeValue = new Date(leadData.dateTime).getTime();
        
        if (!isNaN(timeValue) && timeValue > latestDate) {
          latestDate = timeValue;
          latestLead = leadData;
        }
      }
    }

    return latestLead;
  } catch (error) {
    console.error('❌ Error finding latest lead across all tabs:', error.message);
    return null;
  }
}

module.exports = {
  appendRowByHeader,
  updateSummaryDashboard,
  appendFinalValidationRow,
  appendNonTestRow,
  getLatestLeadIdFromSheet,
  getLatestLeadRowFromSheet,
  appendRawRow,
  getAbsoluteLatestLeadAcrossAllTabs
};