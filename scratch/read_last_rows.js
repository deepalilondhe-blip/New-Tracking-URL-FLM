const { google } = require('googleapis');
const path = require('path');
const fs = require('fs');
require('dotenv').config();

const credentialsPath = path.join(__dirname, '..', 'service_account.json');
const credentials = JSON.parse(fs.readFileSync(credentialsPath, 'utf8'));

async function dumpLastRows(sheetName) {
  const auth = new google.auth.GoogleAuth({
    credentials,
    scopes: ['https://www.googleapis.com/auth/spreadsheets.readonly']
  });
  const client = await auth.getClient();
  const sheets = google.sheets({version: 'v4', auth: client});

  const spreadsheetId = process.env.GOOGLE_SHEET_ID || '1rXIg3dMQ4APH3lHLcfWYfP45PnOAKmV9POkoSS3YWxI';
  const range = `${sheetName}!A:Z`;
  const res = await sheets.spreadsheets.values.get({
    spreadsheetId,
    range
  });

  const rows = res.data.values || [];
  console.log(`\n=== LAST 15 ROWS FROM ${sheetName} ===`);
  const lastRows = rows.slice(-15);
  lastRows.forEach((row, i) => {
    const rowIndex = rows.length - lastRows.length + i + 1;
    // index 9 is column J (Lead ID)
    console.log(`Row ${rowIndex}: DateTime: ${row[0]}, Type: ${row[1]}, Lead ID: ${row[9]}, DBID: ${row[10]}, ThankYou: ${row[12]}`);
  });
}

(async () => {
  await dumpLastRows('Original');
  await dumpLastRows("America's First Tax Relief (AFTR)");
})();
