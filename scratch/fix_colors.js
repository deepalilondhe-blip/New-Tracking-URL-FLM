require('dotenv').config();
const { google } = require('googleapis');
const path = require('path');

async function fixFormatting() {
  try {
    const auth = new google.auth.GoogleAuth({
      keyFile: path.join(__dirname, '../service_account.json'),
      scopes: ['https://www.googleapis.com/auth/spreadsheets']
    });

    const sheets = google.sheets({ version: 'v4', auth });
    const spreadsheetId = process.env.GOOGLE_SHEET_ID;
    
    console.log(`Connecting to Spreadsheet: ${spreadsheetId}`);
    const spreadsheet = await sheets.spreadsheets.get({ spreadsheetId });
    const sheet = spreadsheet.data.sheets.find(s => s.properties.title === 'FTH-quesstionnarie');
    
    if (!sheet) {
      console.log('Sheet FTH-quesstionnarie not found!');
      return;
    }
    
    const sheetId = sheet.properties.sheetId;
    console.log(`Found sheet with ID: ${sheetId}. Applying formatting...`);

    // We will clear existing conditional format rules first, then re-add
    const existingRules = sheet.conditionalFormats || [];
    const deleteRulesRequests = existingRules.map((rule, index) => ({
      deleteConditionalFormatRule: {
        sheetId,
        index: 0 // Always delete at 0 because array shifts
      }
    }));

    await sheets.spreadsheets.batchUpdate({
      spreadsheetId,
      requestBody: {
        requests: [
          ...deleteRulesRequests,
          // Re-apply Header format up to column 29
          {
            repeatCell: {
              range: { sheetId, startRowIndex: 0, endRowIndex: 1, startColumnIndex: 0, endColumnIndex: 29 },
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
          // Re-apply Zebra striping up to column 29
          {
            addConditionalFormatRule: {
              rule: {
                ranges: [{ sheetId, startRowIndex: 1, endRowIndex: 1000, startColumnIndex: 0, endColumnIndex: 29 }],
                booleanRule: {
                  condition: {
                    type: 'CUSTOM_FORMULA',
                    values: [{ userEnteredValue: '=MOD(ROW(),2)=0' }]
                  },
                  format: {
                    backgroundColor: { red: 0.95, green: 0.95, blue: 0.95 }
                  }
                }
              },
              index: 0
            }
          },
          // Re-apply regular row formatting for existing rows
          {
            repeatCell: {
              range: { sheetId, startRowIndex: 1, endRowIndex: 1000, startColumnIndex: 0, endColumnIndex: 29 },
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
          }
        ]
      }
    });

    console.log('✅ Formatting applied up to Step 10!');
  } catch (error) {
    console.error('Error applying formatting:', error);
  }
}

fixFormatting();
