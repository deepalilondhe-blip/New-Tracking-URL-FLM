const { google } = require('googleapis');
require('dotenv').config();

async function run() {
  try {
    const auth = new google.auth.GoogleAuth({
      keyFile: process.env.GOOGLE_SERVICE_ACCOUNT_FILE,
      scopes: ['https://www.googleapis.com/auth/spreadsheets.readonly']
    });
    const client = await auth.getClient();
    const sheets = google.sheets({ version: 'v4', auth: client });
    
    const spreadsheetId = '120uYp2JDXdEjw2_gKLlFFlXlm0A3nuK5zVvIbpQR6OU';
    
    // Retrieve sheet details to get tab name for gid=934782043
    const meta = await sheets.spreadsheets.get({ spreadsheetId });
    const sheet = meta.data.sheets.find(s => s.properties.sheetId === 934782043) || meta.data.sheets[0];
    const title = sheet.properties.title;
    console.log('Tab Title:', title);
    
    const res = await sheets.spreadsheets.values.get({
      spreadsheetId,
      range: `${title}!A1:M50`
    });
    
    console.log('Sheet Data:');
    console.log(JSON.stringify(res.data.values, null, 2));
  } catch (err) {
    console.error('Error reading sheet:', err.message);
  }
}

run();
