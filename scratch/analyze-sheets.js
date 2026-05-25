const { google } = require('googleapis');
require('dotenv').config();

async function authenticate() {
  const auth = new google.auth.GoogleAuth({
    keyFile: 'service-account-creds.json',
    scopes: ['https://www.googleapis.com/auth/spreadsheets']
  });
  return auth.getClient();
}

async function analyzeSheets() {
  try {
    const client = await authenticate();
    const sheets = google.sheets({ version: 'v4', auth: client });
    const spreadsheetId = process.env.GOOGLE_SHEET_ID;

    const spreadsheet = await sheets.spreadsheets.get({
      spreadsheetId
    });
    
    const existingSheets = spreadsheet.data.sheets.map(s => s.properties.title);
    
    const TARGET_SHEET_NAMES = [
      "PPC", "TRA-DT3", "TRA-CPL", "PPC-ST", "PPC-ST2",
      "PPC-M/CA", "PPC-CR", "TRA-CPM", "PPC-FS",
      "FSI-PPC2", "FTD-X", "Everest Tax Releif(X)", "VTS-Original"
    ];

    console.log(`==================================================`);
    console.log(`📊 GOOGLE SHEET AUDIT: SPREADSHEET ANALYSIS`);
    console.log(`==================================================`);
    console.log(`Spreadsheet ID: ${spreadsheetId}`);
    console.log(`All Present Tabs: [${existingSheets.join(', ')}]\n`);

    const incomplete = [];
    const complete = [];

    for (const sheetName of TARGET_SHEET_NAMES) {
      if (!existingSheets.includes(sheetName)) {
        incomplete.push({ sheetName, status: 'Missing Tab entirely from Spreadsheet' });
        continue;
      }

      // Read row values to count them
      const res = await sheets.spreadsheets.values.get({
        spreadsheetId,
        range: `${sheetName}!A2:A100` // Read up to 100 rows to count
      });

      const rowCount = res.data.values ? res.data.values.length : 0;
      
      if (rowCount === 0) {
        incomplete.push({ sheetName, status: 'Tab exists but has 0 records (empty)' });
      } else {
        complete.push({ sheetName, recordCount: rowCount });
      }
    }

    console.log(`🟢 COMPLETE SHEETS (${complete.length}):`);
    complete.forEach(c => console.log(`  - ${c.sheetName}: ${c.recordCount} records`));

    console.log(`\n🔴 INCOMPLETE SHEETS (${incomplete.length}):`);
    incomplete.forEach(i => console.log(`  - ${i.sheetName}: ${i.status}`));

    console.log(`==================================================`);

  } catch (err) {
    console.error('Error during sheet analysis:', err.message);
  }
}

analyzeSheets();
