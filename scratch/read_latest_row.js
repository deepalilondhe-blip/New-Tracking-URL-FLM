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
    const client = await authenticate();
    const sheets = google.sheets({ version: 'v4', auth: client });
    const spreadsheetId = process.env.GOOGLE_SHEET_ID;

    const response = await sheets.spreadsheets.values.get({
      spreadsheetId,
      range: 'LIST!A337:K337'
    });

    console.log('📋 Row 335 values:');
    console.log(JSON.stringify(response.data.values, null, 2));

  } catch (err) {
    console.error('❌ Error reading sheet:', err.message);
  }
})();
