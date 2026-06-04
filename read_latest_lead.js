const {google} = require('googleapis');
const path = require('path');
const fs = require('fs');

// Load service account credentials
const credentialsPath = path.join(__dirname, 'service_account.json');
const credentials = JSON.parse(fs.readFileSync(credentialsPath, 'utf8'));

async function getLatestLeadId() {
  const auth = new google.auth.GoogleAuth({
    credentials,
    scopes: ['https://www.googleapis.com/auth/spreadsheets.readonly']
  });
  const client = await auth.getClient();
  const sheets = google.sheets({version: 'v4', auth: client});

  const spreadsheetId = '1rXIg3dMQ4APH3lHLcfWYfP45PnOAKmV9POkoSS3YWxI';
  // Try to get entire column A (assuming lead IDs are in column A)
  const range = 'A:A';
  const res = await sheets.spreadsheets.values.get({
    spreadsheetId,
    range,
    majorDimension: 'COLUMNS'
  });

  const values = res.data.values?.[0] || [];
  // Find the last non‑empty value
  let latest = '';
  for (let i = values.length - 1; i >= 0; i--) {
    if (values[i] && values[i].trim()) { latest = values[i].trim(); break; }
  }
  console.log('LATEST_LEAD_ID=' + latest);
}

getLatestLeadId().catch(err => {
  console.error('Error fetching lead ID:', err);
});
