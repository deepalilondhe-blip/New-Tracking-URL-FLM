const { google } = require('googleapis');
require('dotenv').config();

const SPREADSHEET_ID = '1hcJgC1E1Bw3V5WdYgPpumQXke_kzMbNX1rCH4kKCBwk';
const sheetName = '09-06-26';

(async () => {
  const auth = new google.auth.GoogleAuth({
    keyFile: 'service_account.json',
    scopes: ['https://www.googleapis.com/auth/spreadsheets']
  });
  const client = await auth.getClient();
  const sheets = google.sheets({ version: 'v4', auth: client });

  // 1. Get all current values
  const res = await sheets.spreadsheets.values.get({
    spreadsheetId: SPREADSHEET_ID,
    range: `'${sheetName}'!A:H`
  });

  if (!res.data.values) {
    console.log('No data found.');
    return;
  }

  const rows = res.data.values;
  const newRows = [];

  // Update Header Row (Row 1)
  newRows.push(['Domain', 'CCPA URL', 'DB Id', 'Device/OS', 'Browser', 'Page', 'WebMail', '']);

  // Date Row (Row 2)
  newRows.push([rows[1][0] || '09/06/26', '', '', '', '', '', '', '']);

  // Data Rows (Row 3 onwards)
  for (let i = 2; i < rows.length; i++) {
    const row = rows[i];
    const sr = row[0] || '';
    const domain = row[1] || '';
    const ccpaUrl = row[2] || '';
    const dbId = row[3] || '';
    const device = row[4] || '';
    const browser = row[5] || '';
    const page = row[6] || '';
    const webmail = row[7] || '';

    // Prefix Domain with Serial Number
    const prefixedDomain = sr ? `${sr}. ${domain}` : domain;

    newRows.push([prefixedDomain, ccpaUrl, dbId, device, browser, page, webmail, '']);
  }

  // Write the updated values back to the sheet
  await sheets.spreadsheets.values.update({
    spreadsheetId: SPREADSHEET_ID,
    range: `'${sheetName}'!A1:H${newRows.length}`,
    valueInputOption: 'USER_ENTERED',
    requestBody: {
      values: newRows
    }
  });

  // Clear column H (since we shifted columns to the left, column H is now empty/extra)
  await sheets.spreadsheets.values.clear({
    spreadsheetId: SPREADSHEET_ID,
    range: `'${sheetName}'!H1:H100`
  });

  // Update background styling for WebMail (G instead of H) and others
  const meta = await sheets.spreadsheets.get({ spreadsheetId: SPREADSHEET_ID });
  const sheetId = meta.data.sheets.find(s => s.properties.title === sheetName).properties.sheetId;

  // Clear previous format and repeat cell formats
  const requests = [];

  // Reset G and H formatting (clear)
  requests.push({
    repeatCell: {
      range: { sheetId, startRowIndex: 0, endRowIndex: newRows.length, startColumnIndex: 6, endColumnIndex: 8 },
      cell: { userEnteredFormat: {} },
      fields: 'userEnteredFormat'
    }
  });

  // Apply new formatting row-by-row
  for (let i = 2; i < newRows.length; i++) {
    // Row background (light cyan for columns A to G)
    requests.push({
      repeatCell: {
        range: { sheetId, startRowIndex: i, endRowIndex: i + 1, startColumnIndex: 0, endColumnIndex: 7 },
        cell: {
          userEnteredFormat: {
            backgroundColor: { red: 0.85, green: 1, blue: 1 },
            borders: { bottom: { style: 'SOLID', color: { red: 0.8, green: 0.8, blue: 0.8 } } }
          }
        },
        fields: 'userEnteredFormat(backgroundColor,borders)'
      }
    });

    // Style WebMail column (G, column index 6) orange if "Mail not generated"
    requests.push({
      repeatCell: {
        range: { sheetId, startRowIndex: i, endRowIndex: i + 1, startColumnIndex: 6, endColumnIndex: 7 },
        cell: {
          userEnteredFormat: {
            backgroundColor: { red: 1, green: 0.85, blue: 0.4 },
            textFormat: { bold: true }
          }
        },
        fields: 'userEnteredFormat(backgroundColor,textFormat)'
      }
    });
  }

  await sheets.spreadsheets.batchUpdate({
    spreadsheetId: SPREADSHEET_ID,
    requestBody: { requests }
  });

  console.log('✅ Successfully shifted SR into Domain column and updated sheet styling!');
})();
