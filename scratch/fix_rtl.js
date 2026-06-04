const { google } = require('googleapis');
const path = require('path');
const fs = require('fs');

async function fixSheet() {
  const auth = new google.auth.GoogleAuth({
    keyFile: path.join(__dirname, 'service-account-creds.json'),
    scopes: ['https://www.googleapis.com/auth/spreadsheets']
  });

  const sheets = google.sheets({ version: 'v4', auth });
  const spreadsheetId = '1rXIg3dMQ4APH3lHLcfWYfP45PnOAKmV9POkoSS3YWxI';
  
  const spreadsheet = await sheets.spreadsheets.get({ spreadsheetId });
  const sheet = spreadsheet.data.sheets.find(s => s.properties.title === 'FTH-quesstionnarie');
  
  if (sheet) {
    await sheets.spreadsheets.batchUpdate({
      spreadsheetId,
      requestBody: {
        requests: [
          {
            updateSheetProperties: {
              properties: {
                sheetId: sheet.properties.sheetId,
                rightToLeft: false
              },
              fields: 'rightToLeft'
            }
          }
        ]
      }
    });
    console.log('Fixed RTL issue!');
  } else {
    console.log('Sheet not found.');
  }
}

fixSheet().catch(console.error);
