require('dotenv').config();
const fs = require('fs');
const path = require('path');
const { google } = require('googleapis');

async function main() {
  const keyPath = path.resolve(__dirname, '..', process.env.GOOGLE_SERVICE_ACCOUNT_FILE || 'service_account.json');
  const spreadsheetId = process.env.GOOGLE_SHEET_ID;

  if (!fs.existsSync(keyPath)) {
    throw new Error(`service account file is missing: ${keyPath}. Set GitHub secret GOOGLE_SERVICE_ACCOUNT_JSON.`);
  }

  let credentials;
  try {
    credentials = JSON.parse(fs.readFileSync(keyPath, 'utf8'));
  } catch (err) {
    throw new Error('GOOGLE_SERVICE_ACCOUNT_JSON is not valid JSON. Paste the full service_account.json contents into that GitHub secret.');
  }

  if (!credentials.client_email || !credentials.private_key) {
    throw new Error('service account JSON is missing client_email or private_key.');
  }

  if (!spreadsheetId) {
    throw new Error('GOOGLE_SHEET_ID is missing.');
  }

  const auth = new google.auth.GoogleAuth({
    keyFile: keyPath,
    scopes: ['https://www.googleapis.com/auth/spreadsheets']
  });
  const sheets = google.sheets({ version: 'v4', auth });
  const spreadsheet = await sheets.spreadsheets.get({ spreadsheetId });
  const title = spreadsheet.data.properties.title;
  const tabs = (spreadsheet.data.sheets || []).map(s => s.properties.title);

  console.log(`✅ Google Sheet access OK: "${title}"`);
  console.log(`✅ Service account: ${credentials.client_email}`);
  console.log(`✅ Tabs visible: ${tabs.length}`);
}

main().catch((err) => {
  console.error('❌ Google Sheet access failed:', err.message);
  console.error('Share the spreadsheet as Editor with the service account email, and store the full JSON in GitHub secret GOOGLE_SERVICE_ACCOUNT_JSON.');
  process.exit(1);
});
