const { google } = require('googleapis');
const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '..', '.env') });

async function authenticate() {
  let keyPath = process.env.GOOGLE_SERVICE_ACCOUNT_FILE || 'service_account.json';
  if (!path.isAbsolute(keyPath)) {
    keyPath = path.resolve(__dirname, '..', keyPath);
  }
  const auth = new google.auth.GoogleAuth({
    keyFile: keyPath,
    scopes: ['https://www.googleapis.com/auth/spreadsheets', 'https://www.googleapis.com/auth/drive']
  });
  return auth.getClient();
}

(async () => {
  try {
    console.log('🔑 Authenticating...');
    const client = await authenticate();
    const sheets = google.sheets({ version: 'v4', auth: client });
    const spreadsheetId = process.env.GOOGLE_SHEET_ID;

    if (!spreadsheetId) {
      throw new Error('GOOGLE_SHEET_ID is not set in .env file.');
    }

    console.log(`📡 Fetching spreadsheet details for ID: ${spreadsheetId}...`);
    const spreadsheet = await sheets.spreadsheets.get({ spreadsheetId });
    const sheetList = spreadsheet.data.sheets || [];

    console.log(`📋 Found ${sheetList.length} sheets in spreadsheet.`);

    const requests = [];

    for (const sheet of sheetList) {
      const title = sheet.properties.title;
      const sheetId = sheet.properties.sheetId;
      const colCount = sheet.properties.gridProperties ? sheet.properties.gridProperties.columnCount : 29;
      
      console.log(`Adding formatting requests for sheet: "${title}" (ID: ${sheetId}, columns: ${colCount})`);

      // We only apply column formats up to the number of columns in the sheet
      const endColIndex = Math.min(29, colCount);

      // 1. Format header row (navy background, white text)
      requests.push({
        repeatCell: {
          range: { sheetId, startRowIndex: 0, endRowIndex: 1, startColumnIndex: 0, endColumnIndex: endColIndex },
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
      });

      // 2. Add Zebra striping conditional format rule (even rows highlighted with light blue #E8F0FE)
      requests.push({
        addConditionalFormatRule: {
          rule: {
            ranges: [{ sheetId, startRowIndex: 1, endRowIndex: 1000, startColumnIndex: 0, endColumnIndex: endColIndex }],
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
      });

      // 3. Set standard column widths (only if they exist in the sheet)
      if (colCount > 0) {
        requests.push({ updateDimensionProperties: { range: { sheetId, dimension: 'COLUMNS', startIndex: 0, endIndex: Math.min(29, colCount) }, properties: { pixelSize: 140 }, fields: 'pixelSize' } });
      }
      if (colCount > 4) {
        requests.push({ updateDimensionProperties: { range: { sheetId, dimension: 'COLUMNS', startIndex: 4, endIndex: 5 }, properties: { pixelSize: 180 }, fields: 'pixelSize' } });
      }
      if (colCount > 11) {
        requests.push({ updateDimensionProperties: { range: { sheetId, dimension: 'COLUMNS', startIndex: 11, endIndex: 12 }, properties: { pixelSize: 320 }, fields: 'pixelSize' } });
      }
      if (colCount > 12) {
        requests.push({ updateDimensionProperties: { range: { sheetId, dimension: 'COLUMNS', startIndex: 12, endIndex: 13 }, properties: { pixelSize: 240 }, fields: 'pixelSize' } });
      }
      
      // 4. Ensure LTR layout
      requests.push({ updateSheetProperties: { properties: { sheetId, rightToLeft: false }, fields: 'rightToLeft' } });
    }

    if (requests.length > 0) {
      console.log(`📤 Sending batchUpdate request with ${requests.length} formatting actions...`);
      await sheets.spreadsheets.batchUpdate({
        spreadsheetId,
        requestBody: { requests }
      });
      console.log('✅ Formatting applied successfully to ALL sheets!');
    } else {
      console.log('No sheets to format.');
    }

  } catch (err) {
    console.error('❌ Error formatting sheets:', err.message);
  }
})();
