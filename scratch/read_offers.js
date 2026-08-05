const { google } = require('googleapis');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

async function authenticate() {
  const auth = new google.auth.GoogleAuth({
    keyFile: path.join(__dirname, '..', process.env.GOOGLE_SERVICE_ACCOUNT_FILE),
    scopes: ['https://www.googleapis.com/auth/spreadsheets']
  });
  return auth.getClient();
}

async function run() {
  const client = await authenticate();
  const sheets = google.sheets({ version: 'v4', auth: client });
  const spreadsheetId = '1TJYMxbyREFVIIGYIdb15SpwG0X6Kmm4nhmBS_OUE8EY';

  console.log(`Reading offers sheet...`);
  try {
    const res = await sheets.spreadsheets.values.get({
      spreadsheetId,
      range: `offers!A1:Z100`,
    });

    const rows = res.data.values || [];
    console.log(`Fetched ${rows.length} rows.`);
    rows.forEach((row, i) => {
      console.log(`Row ${i + 1}:`, row);
    });
  } catch (err) {
    console.error('Error reading offers:', err.message);
  }
}

run().catch(console.error);
