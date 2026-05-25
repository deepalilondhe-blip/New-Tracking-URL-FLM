const { google } = require('googleapis');
require('dotenv').config();

async function authenticate() {
  const auth = new google.auth.GoogleAuth({
    keyFile: 'service-account-creds.json',
    scopes: ['https://www.googleapis.com/auth/spreadsheets']
  });
  return auth.getClient();
}

async function cleanupDuplicateColumns() {
  try {
    const client = await authenticate();
    const sheets = google.sheets({ version: 'v4', auth: client });
    const spreadsheetId = process.env.GOOGLE_SHEET_ID;

    console.log('📡 Fetching spreadsheet properties...');
    const spreadsheet = await sheets.spreadsheets.get({
      spreadsheetId
    });

    const existingSheets = spreadsheet.data.sheets;
    const requests = [];

    console.log(`🧹 Scanning ${existingSheets.length} sheet tabs for extra columns...`);

    for (const sheet of existingSheets) {
      const title = sheet.properties.title;
      const sheetId = sheet.properties.sheetId;
      const colCount = sheet.properties.gridProperties.columnCount;

      // If sheet has more than 22 columns (which is A to V), delete the extra ones (W, X, Y, etc.)
      if (colCount > 22) {
        console.log(`📌 Sheet "${title}" has ${colCount} columns. Queueing deletion of columns W, X, Y (indices 22 to ${colCount})...`);
        requests.push({
          deleteDimension: {
            range: {
              sheetId: sheetId,
              dimension: "COLUMNS",
              startIndex: 22, // 22 is Column W (0-indexed)
              endIndex: colCount // Delete everything up to the end
            }
          }
        });
      }
    }

    if (requests.length === 0) {
      console.log('✅ No duplicate columns found. All sheets are already clean and perfect!');
      return;
    }

    console.log(`🚀 Sending batch delete request for ${requests.length} sheets...`);
    await sheets.spreadsheets.batchUpdate({
      spreadsheetId,
      requestBody: { requests }
    });

    console.log('🎉 Successfully removed all duplicate columns (W, X, Y) from all sheets!');

  } catch (error) {
    console.error('❌ Error cleaning up duplicate columns:', error.message);
  }
}

cleanupDuplicateColumns();
