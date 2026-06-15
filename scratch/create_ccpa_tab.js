const { google } = require('googleapis');

const SPREADSHEET_ID = '1hcJgC1E1Bw3V5WdYgPpumQXke_kzMbNX1rCH4kKCBwk';

(async () => {
  try {
    const auth = new google.auth.GoogleAuth({
      keyFile: 'service_account.json',
      scopes: ['https://www.googleapis.com/auth/spreadsheets']
    });
    const client = await auth.getClient();
    const sheets = google.sheets({ version: 'v4', auth: client });

    const todayDate = new Date();
    const dateTabName = `${String(todayDate.getDate()).padStart(2, '0')}-${String(todayDate.getMonth() + 1).padStart(2, '0')}-${String(todayDate.getFullYear()).slice(-2)}`;
    
    console.log(`Checking if sheet tab '${dateTabName}' exists...`);
    const meta = await sheets.spreadsheets.get({ spreadsheetId: SPREADSHEET_ID });
    const exists = meta.data.sheets.some(s => s.properties.title === dateTabName);

    if (exists) {
      console.log(`Sheet tab '${dateTabName}' already exists.`);
    } else {
      console.log(`Creating sheet tab '${dateTabName}'...`);
      await sheets.spreadsheets.batchUpdate({
        spreadsheetId: SPREADSHEET_ID,
        requestBody: {
          requests: [
            {
              addSheet: {
                properties: {
                  title: dateTabName
                }
              }
            }
          ]
        }
      });
      console.log(`Successfully created sheet tab '${dateTabName}'!`);
    }
  } catch (error) {
    console.error('Error:', error.message);
  }
})();
