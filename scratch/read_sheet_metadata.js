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
    // Use the spreadsheet ID provided by the user
    const spreadsheetId = process.env.GOOGLE_SHEET_ID;

    console.log('📡 Fetching spreadsheet metadata...');
    const metadata = await sheets.spreadsheets.get({
      spreadsheetId
    });

    const sheetNames = metadata.data.sheets.map(s => s.properties.title);
    console.log('📋 Sheets/Tabs list:');
    sheetNames.forEach((name, i) => {
      console.log(`${i + 1}: "${name}"`);
    });

  } catch (err) {
    console.error('❌ Error fetching sheet metadata:', err.message);
  }
})();
