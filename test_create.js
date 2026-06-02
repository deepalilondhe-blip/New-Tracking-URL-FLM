const { google } = require('googleapis');
require('dotenv').config();

async function testCreate() {
  try {
    const auth = new google.auth.GoogleAuth({
      keyFile: process.env.GOOGLE_SERVICE_ACCOUNT_FILE,
      scopes: ['https://www.googleapis.com/auth/spreadsheets', 'https://www.googleapis.com/auth/drive']
    });
    const client = await auth.getClient();
    const sheets = google.sheets({ version: 'v4', auth: client });

    console.log("Trying to create spreadsheet via Sheets API...");
    const createResponse = await sheets.spreadsheets.create({
      requestBody: {
        properties: { title: 'Test Create' }
      }
    });
    console.log("Created successfully:", createResponse.data.spreadsheetId);
  } catch (e) {
    console.error("Sheets API Create failed:", e.message);
  }
}

testCreate();
