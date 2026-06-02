const { google } = require('googleapis');
require('dotenv').config();

async function testDriveCreate() {
  try {
    const auth = new google.auth.GoogleAuth({
      keyFile: process.env.GOOGLE_SERVICE_ACCOUNT_FILE,
      scopes: ['https://www.googleapis.com/auth/drive', 'https://www.googleapis.com/auth/spreadsheets']
    });
    const client = await auth.getClient();
    const drive = google.drive({ version: 'v3', auth: client });

    console.log("Trying to create spreadsheet via Drive API...");
    const res = await drive.files.create({
      requestBody: {
        name: 'Test Create Drive',
        mimeType: 'application/vnd.google-apps.spreadsheet'
      }
    });
    console.log("Created successfully via Drive API:", res.data.id);
  } catch (e) {
    console.error("Drive API Create failed:", e.message);
  }
}

testDriveCreate();
