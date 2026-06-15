const { google } = require('googleapis');
require('dotenv').config();

const SPREADSHEET_ID = '1hcJgC1E1Bw3V5WdYgPpumQXke_kzMbNX1rCH4kKCBwk';
const sheetName = '11-06-26';

const dataRows = [
  ["1","http://www.fresh-start-initiative.com","http://www.fresh-start-initiative.com/ccpa/","54600","Windows","Chrome","Thankyou","Mail not generated"],
  ["2","http://www.veteranstaxservices.com","http://www.veteranstaxservices.com/ccpa/","54602","Windows","Chrome","Thankyou","Mail not generated"],
  ["3","https://www.jdavidtaxlaw.co","https://www.jdavidtaxlaw.co/ccpa/","54603","Windows","Chrome","Thankyou","Mail not generated"],
  ["4","https://www.justicetaxrelief.com","https://www.justicetaxrelief.com/ccpa/","54604","Windows","Chrome","Thankyou","Mail not generated"],
  ["5","https://www.fidelity-tax-defense.net","https://www.fidelity-tax-defense.net/ccpa/","54605","Windows","Chrome","Thankyou","Mail not generated"],
  ["6","http://www.second-chance-tax-relief.net","http://www.second-chance-tax-relief.net/ccpa/","54606","Windows","Chrome","Thankyou","Mail not generated"],
  ["7","http://www.veteranstaxservices.com","http://www.veteranstaxservices.com/ccpa/","54602","Windows","Chrome","Thankyou","Mail not generated"],
  ["8","https://www.fresh-startinitiative.com","https://www.fresh-startinitiative.com/ccpa/","54608","Windows","Chrome","Thankyou","Mail not generated"],
  ["9","https://everesttaxrelief.net","https://everesttaxrelief.net/ccpa/","54609","Windows","Chrome","Thankyou","Mail not generated"],
  ["10","https://1800freshtax.com","https://1800freshtax.com/ccpa/","54598","Windows","Chrome","Thankyou","Mail not generated"],
  ["11","https://americasfirsttaxrelief.com","https://americasfirsttaxrelief.com/ccpa/","54611","Windows","Chrome","Thankyou","Mail not generated"],
  ["12","https://tra.com","https://tra.com/ccpa-request","N/A","Windows","Chrome","Thankyou","Mail not generated"],
  ["13","https://topmoneyprogram.com","https://topmoneyprogram.com/ccpa/","54612","Windows","Chrome","Thankyou","Mail not generated"]
];

(async () => {
  try {
    const auth = new google.auth.GoogleAuth({
      keyFile: 'service_account.json',
      scopes: ['https://www.googleapis.com/auth/spreadsheets']
    });
    const client = await auth.getClient();
    const sheets = google.sheets({ version: 'v4', auth: client });

    const newRows = [];
    newRows.push(['SR', 'Domain', 'CCPA URL', 'DB Id', 'Device/OS', 'Browser', 'Page', 'WebMail']);

    const today = new Date();
    const dateStr = `${String(today.getDate()).padStart(2, '0')}/${String(today.getMonth() + 1).padStart(2, '0')}/${String(today.getFullYear()).slice(-2)}`;
    newRows.push(['', `'` + dateStr, '', '', '', '', '', '']);

    newRows.push(...dataRows);

    console.log(`Writing ${newRows.length} total rows...`);

    // 1. Clear entire sheet content first to avoid leftovers
    await sheets.spreadsheets.values.clear({
      spreadsheetId: SPREADSHEET_ID,
      range: `'${sheetName}'!A1:Z100`
    });

    // 2. Write new rows
    await sheets.spreadsheets.values.update({
      spreadsheetId: SPREADSHEET_ID,
      range: `'${sheetName}'!A1:H${newRows.length}`,
      valueInputOption: 'USER_ENTERED',
      requestBody: {
        values: newRows
      }
    });

    // 3. Update background styling matching user's image exactly
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

    console.log('✅ Successfully restored all CCPA records, headers, dates, and formatting for today!');
  } catch (err) {
    console.error('Error:', err.message);
  }
})();
