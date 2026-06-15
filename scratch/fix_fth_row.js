const { google } = require('googleapis');
require('dotenv').config();

async function authenticate() {
  const auth = new google.auth.GoogleAuth({
    keyFile: process.env.GOOGLE_SERVICE_ACCOUNT_FILE,
    scopes: ['https://www.googleapis.com/auth/spreadsheets', 'https://www.googleapis.com/auth/drive']
  });
  return auth.getClient();
}

async function fixRow() {
  try {
    const client = await authenticate();
    const sheets = google.sheets({ version: 'v4', auth: client });
    const spreadsheetId = process.env.GOOGLE_SHEET_ID;
    const sheetName = 'FTH-quesstionnarie';

    console.log(`🔍 Fetching rows from sheet "${sheetName}" to locate Lead ID 51C5BB72...`);
    const res = await sheets.spreadsheets.values.get({
      spreadsheetId,
      range: `${sheetName}!A:J`
    });

    const rows = res.data.values || [];
    let targetRowIndex = -1;

    for (let i = 0; i < rows.length; i++) {
      if (rows[i][9] === '51C5BB72') { // Column J is index 9 (Lead ID)
        targetRowIndex = i + 1; // 1-indexed row number
        break;
      }
    }

    if (targetRowIndex === -1) {
      console.log('❌ Could not find Lead ID 51C5BB72 in sheet!');
      return;
    }

    console.log(`✅ Found Lead ID at Row ${targetRowIndex}! Updating DBID (Column K) and CDB Status (Column N)...`);

    // Column K is index 10 (1-based column 11 = K)
    // Column N is index 13 (1-based column 14 = N)
    
    // Update DBID
    await sheets.spreadsheets.values.update({
      spreadsheetId,
      range: `${sheetName}!K${targetRowIndex}`,
      valueInputOption: 'USER_ENTERED',
      requestBody: {
        values: [['327422']]
      }
    });

    // Update CDB Status
    await sheets.spreadsheets.values.update({
      spreadsheetId,
      range: `${sheetName}!N${targetRowIndex}`,
      valueInputOption: 'USER_ENTERED',
      requestBody: {
        values: [['TRUE']]
      }
    });

    console.log(`🎉 Row ${targetRowIndex} updated successfully in Google Sheet!`);
  } catch (error) {
    console.error('❌ Failed to update sheet:', error.message);
  }
}

fixRow();
