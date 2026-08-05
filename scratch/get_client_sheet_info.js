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
  
  const clientSpreadsheetId = '1TJYMxbyREFVIIGYIdb15SpwG0X6Kmm4nhmBS_OUE8EY';
  const localSpreadsheetId = process.env.GOOGLE_SHEET_ID;

  console.log(`Fetching title for client spreadsheet: ${clientSpreadsheetId}`);
  const clientMeta = await sheets.spreadsheets.get({ spreadsheetId: clientSpreadsheetId });
  console.log(`Client Spreadsheet Title: "${clientMeta.data.properties.title}"`);

  console.log(`Fetching title for local spreadsheet: ${localSpreadsheetId}`);
  const localMeta = await sheets.spreadsheets.get({ spreadsheetId: localSpreadsheetId });
  console.log(`Local Spreadsheet Title: "${localMeta.data.properties.title}"`);
}

run().catch(console.error);
