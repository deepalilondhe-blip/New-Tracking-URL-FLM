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

    const formattedRow = [
      rowData.dateTime,
      "D",
      rowData.affiliate,
      rowData.campaignId,
      rowData.trackingLink,
      rowData.sliderAmount,
      rowData.cakeIncome,
      rowData.state,
      rowData.phone,
      rowData.leadId,
      rowData.dbid,
      rowData.thankYouUrl,
      rowData.pageOrigin,
      rowData.cdbStatus,
      rowData.cdbEmail,
      rowData.neustar,
      rowData.neustarDisposition,
      rowData.pixelFired,
      rowData.runDate
    ];

    await sheets.spreadsheets.values.append({
      spreadsheetId: process.env.GOOGLE_SHEET_ID,
      range: `${sheetName}!A:S`,
      valueInputOption: 'USER_ENTERED',
      insertDataOption: 'INSERT_ROWS',
      requestBody: {
        values: [formattedRow]
      }
    });

    console.log(`✅ Row appended successfully to sheet: ${sheetName}`);
    return true;
  } catch (error) {
    console.error('❌ Google Sheets Error:', error.message);
    return false;
  }
}

module.exports = {
  appendRowByHeader
};