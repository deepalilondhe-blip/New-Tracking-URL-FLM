const { google } = require('googleapis');
require('dotenv').config();

async function authenticate() {
  const auth = new google.auth.GoogleAuth({
    keyFile: 'service-account-creds.json',
    scopes: ['https://www.googleapis.com/auth/spreadsheets']
  });
  return auth.getClient();
}

async function applyZebraFormatting() {
  try {
    const client = await authenticate();
    const sheets = google.sheets({ version: 'v4', auth: client });
    const spreadsheetId = process.env.GOOGLE_SHEET_ID;

    console.log('📡 Fetching spreadsheet tabs...');
    const spreadsheet = await sheets.spreadsheets.get({ spreadsheetId });
    const existingSheets = spreadsheet.data.sheets;

    const requests = [];

    console.log(`🎨 Preparing premium zebra striping formatting for ${existingSheets.length} tabs...`);

    for (const sheet of existingSheets) {
      const title = sheet.properties.title;
      const sheetId = sheet.properties.sheetId;
      const condFormats = sheet.conditionalFormats || [];
      const numFormats = condFormats.length;

      console.log(`⚙️ Queueing styling requests for sheet: "${title}" (Found ${numFormats} existing format rules)`);

      // Delete all existing conditional format rules by repeatedly deleting index 0
      for (let i = 0; i < numFormats; i++) {
        requests.push({
          deleteConditionalFormatRule: {
            sheetId: sheetId,
            index: 0
          }
        });
      }

      // 2. Format Header Row (Row 1) - Dark Navy Blue background and Bold White text
      requests.push({
        repeatCell: {
          range: { sheetId, startRowIndex: 0, endRowIndex: 1, startColumnIndex: 0, endColumnIndex: 22 },
          cell: {
            userEnteredFormat: {
              backgroundColor: { red: 0.0, green: 0.125, blue: 0.376 }, // Dark Navy
              textFormat: {
                foregroundColor: { red: 1.0, green: 1.0, blue: 1.0 },
                bold: true,
                fontSize: 10,
                fontFamily: 'Inter'
              },
              horizontalAlignment: 'CENTER',
              verticalAlignment: 'MIDDLE'
            }
          },
          fields: 'userEnteredFormat(backgroundColor,textFormat,horizontalAlignment,verticalAlignment)'
        }
      });

      // 3. Reset all other rows to White background & Black text (Clears manual formatting overlaps)
      requests.push({
        repeatCell: {
          range: { sheetId, startRowIndex: 1, endRowIndex: 1000, startColumnIndex: 0, endColumnIndex: 22 },
          cell: {
            userEnteredFormat: {
              backgroundColor: { red: 1.0, green: 1.0, blue: 1.0 },
              textFormat: {
                foregroundColor: { red: 0.0, green: 0.0, blue: 0.0 },
                bold: false,
                fontSize: 10,
                fontFamily: 'Inter'
              },
              horizontalAlignment: 'CENTER',
              verticalAlignment: 'MIDDLE'
            }
          },
          fields: 'userEnteredFormat(backgroundColor,textFormat,horizontalAlignment,verticalAlignment)'
        }
      });

      // 4. Inject exactly ONE clean conditional zebra format rule
      requests.push({
        addConditionalFormatRule: {
          rule: {
            ranges: [{
              sheetId,
              startRowIndex: 1,
              endRowIndex: 1000,
              startColumnIndex: 0,
              endColumnIndex: 22
            }],
            booleanRule: {
              condition: {
                type: 'CUSTOM_FORMULA',
                values: [{ userEnteredValue: '=ISEVEN(ROW())' }]
              },
              format: {
                backgroundColor: { red: 0.933, green: 0.953, blue: 0.988 } // Premium light blue tint (#EEF3FC)
              }
            }
          },
          index: 0
        }
      });

      // 5. Explicitly format Hyperlink Columns (Column E/Index 4, Column L/Index 11, Column M/Index 12)
      requests.push({
        repeatCell: {
          range: { sheetId, startRowIndex: 1, endRowIndex: 1000, startColumnIndex: 4, endColumnIndex: 5 },
          cell: {
            userEnteredFormat: {
              textFormat: {
                foregroundColor: { red: 0.062, green: 0.353, blue: 0.824 },
                underline: true,
                fontSize: 10
              }
            }
          },
          fields: 'userEnteredFormat(textFormat)'
        }
      });
      requests.push({
        repeatCell: {
          range: { sheetId, startRowIndex: 1, endRowIndex: 1000, startColumnIndex: 11, endColumnIndex: 13 },
          cell: {
            userEnteredFormat: {
              textFormat: {
                foregroundColor: { red: 0.062, green: 0.353, blue: 0.824 },
                underline: true,
                fontSize: 10
              }
            }
          },
          fields: 'userEnteredFormat(textFormat)'
        }
      });

      // 6. Set Uniform Column Widths (Index 0-21)
      requests.push({
        updateDimensionProperties: {
          range: { sheetId, dimension: 'COLUMNS', startIndex: 0, endIndex: 22 },
          properties: { pixelSize: 140 },
          fields: 'pixelSize'
        }
      });
      // Expanded widths for URL/Link columns
      requests.push({
        updateDimensionProperties: {
          range: { sheetId, dimension: 'COLUMNS', startIndex: 4, endIndex: 5 }, // Tracking Link
          properties: { pixelSize: 180 },
          fields: 'pixelSize'
        }
      });
      requests.push({
        updateDimensionProperties: {
          range: { sheetId, dimension: 'COLUMNS', startIndex: 11, endIndex: 12 }, // Page Origin
          properties: { pixelSize: 240 },
          fields: 'pixelSize'
        }
      });
      requests.push({
        updateDimensionProperties: {
          range: { sheetId, dimension: 'COLUMNS', startIndex: 12, endIndex: 13 }, // Thank u URL
          properties: { pixelSize: 320 },
          fields: 'pixelSize'
        }
      });
    }

    console.log('🚀 Submitting master formatting transaction to Google Sheets API...');
    await sheets.spreadsheets.batchUpdate({
      spreadsheetId,
      requestBody: { requests }
    });

    console.log('🎉 Superb! Alternate zebra styling applied flawlessly and uniformly across all sheets!');

  } catch (error) {
    console.error('❌ Error applying zebra formatting:', error.message);
  }
}

applyZebraFormatting();
