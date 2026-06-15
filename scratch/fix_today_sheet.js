const { google } = require('googleapis');
require('dotenv').config();

const SPREADSHEET_ID = '1hcJgC1E1Bw3V5WdYgPpumQXke_kzMbNX1rCH4kKCBwk';
const sheetName = '11-06-26';

(async () => {
  try {
    const auth = new google.auth.GoogleAuth({
      keyFile: 'service_account.json',
      scopes: ['https://www.googleapis.com/auth/spreadsheets']
    });
    const client = await auth.getClient();
    const sheets = google.sheets({ version: 'v4', auth: client });

    // 1. Get all current values
    const res = await sheets.spreadsheets.values.get({
      spreadsheetId: SPREADSHEET_ID,
      range: `'${sheetName}'!A:J`
    });

    if (!res.data.values) {
      console.log('No data found.');
      return;
    }

    const rows = res.data.values;
    const newRows = [];

    // Row 1: Header
    newRows.push(['SR', 'Domain', 'CCPA URL', 'DB Id', 'Device/OS', 'Browser', 'Page', 'WebMail']);

    // Row 2: Date row
    const today = new Date();
    const dateStr = `${String(today.getDate()).padStart(2, '0')}/${String(today.getMonth() + 1).padStart(2, '0')}/${String(today.getFullYear()).slice(-2)}`;
    newRows.push(['', `'` + dateStr, '', '', '', '', '', '']);

    // Row 3 onwards: Data rows
    for (const row of rows) {
      // Check if it is a data row. A data row has a serial number at index 1.
      const sr = row[1] ? row[1].trim() : '';
      if (sr && /^\d+$/.test(sr)) {
        const domain = row[2] || '';
        const ccpaUrl = row[3] || '';
        const dbId = row[4] || '';
        const device = row[5] || '';
        const browser = row[6] || '';
        const page = row[7] || '';
        const webmail = row[8] || 'Mail not generated';

        newRows.push([sr, domain, ccpaUrl, dbId, device, browser, page, webmail]);
      }
    }

    console.log(`Parsed ${newRows.length - 2} data rows.`);

    // 2. Clear entire sheet content first to avoid leftovers
    await sheets.spreadsheets.values.clear({
      spreadsheetId: SPREADSHEET_ID,
      range: `'${sheetName}'!A1:Z100`
    });

    // 3. Write new rows
    await sheets.spreadsheets.values.update({
      spreadsheetId: SPREADSHEET_ID,
      range: `'${sheetName}'!A1:H${newRows.length}`,
      valueInputOption: 'USER_ENTERED',
      requestBody: {
        values: newRows
      }
    });

    // 4. Update background styling matching user's image exactly
    const meta = await sheets.spreadsheets.get({ spreadsheetId: SPREADSHEET_ID });
    const sheetId = meta.data.sheets.find(s => s.properties.title === sheetName).properties.sheetId;

    const requests = [];

    // Clear formats first
    requests.push({
      repeatCell: {
        range: { sheetId, startRowIndex: 0, endRowIndex: newRows.length, startColumnIndex: 0, endColumnIndex: 8 },
        cell: { userEnteredFormat: {} },
        fields: 'userEnteredFormat'
      }
    });

    // Header styling (Row 1): Light grey background, bold text
    requests.push({
      repeatCell: {
        range: { sheetId, startRowIndex: 0, endRowIndex: 1, startColumnIndex: 0, endColumnIndex: 8 },
        cell: {
          userEnteredFormat: {
            backgroundColor: { red: 0.85, green: 0.85, blue: 0.85 },
            textFormat: { bold: true },
            horizontalAlignment: 'CENTER'
          }
        },
        fields: 'userEnteredFormat(backgroundColor,textFormat,horizontalAlignment)'
      }
    });

    // Date row styling (Row 2): Bright Cyan background, bold text
    requests.push({
      repeatCell: {
        range: { sheetId, startRowIndex: 1, endRowIndex: 2, startColumnIndex: 0, endColumnIndex: 8 },
        cell: {
          userEnteredFormat: {
            backgroundColor: { red: 0, green: 1, blue: 1 },
            textFormat: { bold: true },
            horizontalAlignment: 'CENTER'
          }
        },
        fields: 'userEnteredFormat(backgroundColor,textFormat,horizontalAlignment)'
      }
    });

    // Data rows borders and WebMail yellow styling
    for (let i = 2; i < newRows.length; i++) {
      // Add grid lines for data rows
      requests.push({
        repeatCell: {
          range: { sheetId, startRowIndex: i, endRowIndex: i + 1, startColumnIndex: 0, endColumnIndex: 8 },
          cell: {
            userEnteredFormat: {
              borders: {
                bottom: { style: 'SOLID', color: { red: 0.8, green: 0.8, blue: 0.8 } },
                top: { style: 'SOLID', color: { red: 0.8, green: 0.8, blue: 0.8 } },
                left: { style: 'SOLID', color: { red: 0.8, green: 0.8, blue: 0.8 } },
                right: { style: 'SOLID', color: { red: 0.8, green: 0.8, blue: 0.8 } }
              }
            }
          },
          fields: 'userEnteredFormat(borders)'
        }
      });

      // Style WebMail column (Column H / index 7) yellow if it contains "Mail not generated"
      requests.push({
        repeatCell: {
          range: { sheetId, startRowIndex: i, endRowIndex: i + 1, startColumnIndex: 7, endColumnIndex: 8 },
          cell: {
            userEnteredFormat: {
              backgroundColor: { red: 1, green: 1, blue: 0 },
              textFormat: { bold: true },
              horizontalAlignment: 'CENTER'
            }
          },
          fields: 'userEnteredFormat(backgroundColor,textFormat,horizontalAlignment)'
        }
      });
    }

    await sheets.spreadsheets.batchUpdate({
      spreadsheetId: SPREADSHEET_ID,
      requestBody: { requests }
    });

    console.log('✅ Successfully fixed headers, column shifting, and formatting for today\'s sheet!');
  } catch (err) {
    console.error('Error:', err.message);
  }
})();
