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

    console.log('📡 Fetching AFTR sheet data...');
    const res = await sheets.spreadsheets.values.get({
      spreadsheetId,
      range: 'AFTR!A50:V55'
    });

    console.log('📋 Rows found in AFTR (Rows 50-55):');
    const rows = res.data.values || [];
    rows.forEach((row, idx) => {
      console.log(`Row ${50 + idx}:`, row);
    });

  } catch (err) {
    console.error('❌ Error reading sheet:', err.message);
  }
})();
