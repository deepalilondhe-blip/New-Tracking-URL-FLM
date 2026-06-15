const { chromium } = require('playwright-extra');
const stealth = require('puppeteer-extra-plugin-stealth')();
const { google } = require('googleapis');
require('dotenv').config();

process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';
chromium.use(stealth);

// ========== CONFIG ==========
const FLM_URL = 'https://flm-utility.com/ccpa_request/local_storage/login.php?msg=Please%20login%20to%20browse.';
const FLM_AUTH_URL = 'https://flm-utility.com/ccpa_request/local_storage/read/?authKey=b7hak8w2nKDb2KS2n0d';
const FLM_USER = 'admin';
const FLM_PASS = '@cce$$4F0rw@rdL3@p';
const SPREADSHEET_ID = '1hcJgC1E1Bw3V5WdYgPpumQXke_kzMbNX1rCH4kKCBwk';
const DOMAIN_TO_FIND = '1800freshtax';

(async () => {
  const userDataDir = './ccpa-browser-profile';

  const browser = await chromium.launchPersistentContext(userDataDir, {
    headless: false,
    args: [
      '--disable-blink-features=AutomationControlled',
      '--no-sandbox',
      '--window-size=1400,900'
    ],
    viewport: { width: 1400, height: 900 },
    ignoreHTTPSErrors: true,
    locale: 'en-US',
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36'
  });

  const page = browser.pages()[0] || await browser.newPage();

  // ========== STEP 1: Login to FLM Portal ==========
  console.log('🌐 Navigating to FLM portal...');
  await page.goto(FLM_URL, { waitUntil: 'networkidle', timeout: 30000 });
  await page.waitForTimeout(2000);

  const currentUrl = page.url();
  if (currentUrl.includes('login')) {
    console.log('🔑 Logging in...');
    await page.fill('input[name="username"]', FLM_USER);
    await page.fill('input[name="password"]', FLM_PASS);
    await page.click('button:has-text("Login"), input[type="submit"]');
    await page.waitForTimeout(3000);
    console.log('✅ Logged in! URL:', page.url());
  } else {
    console.log('✅ Already logged in!');
  }

  // Navigate to the data page
  if (!page.url().includes('authKey')) {
    await page.goto(FLM_AUTH_URL, { waitUntil: 'networkidle', timeout: 30000 });
    await page.waitForTimeout(3000);
  }

  await page.screenshot({ path: 'flm_portal_data.png', fullPage: true });
  console.log('📸 Screenshot saved: flm_portal_data.png');

  // ========== STEP 2: Extract data from table ==========
  console.log('\n📊 Extracting data from local storage table...');

  // Get all table rows
  const tableData = await page.evaluate((domainSearch) => {
    const tables = document.querySelectorAll('table');
    const results = [];

    for (const table of tables) {
      const rows = table.querySelectorAll('tr');
      for (const row of rows) {
        const cells = row.querySelectorAll('td, th');
        const rowData = Array.from(cells).map(cell => cell.textContent.trim());
        const rowHtml = row.innerHTML;

        // Check if this row contains our domain
        if (rowHtml.toLowerCase().includes(domainSearch.toLowerCase())) {
          results.push({
            cells: rowData,
            html: rowHtml
          });
        }
      }
    }

    // Also get all headers
    let headers = [];
    if (tables.length > 0) {
      const headerRow = tables[0].querySelector('tr');
      if (headerRow) {
        headers = Array.from(headerRow.querySelectorAll('th, td')).map(cell => cell.textContent.trim());
      }
    }

    // Get all rows for debugging
    let allRows = [];
    if (tables.length > 0) {
      const rows = tables[0].querySelectorAll('tr');
      for (let i = 0; i < Math.min(rows.length, 5); i++) {
        const cells = rows[i].querySelectorAll('td, th');
        allRows.push(Array.from(cells).map(cell => cell.textContent.trim()));
      }
    }

    return { results, headers, allRows, tableCount: tables.length };
  }, DOMAIN_TO_FIND);

  console.log('📋 Tables found:', tableData.tableCount);
  console.log('📋 Headers:', JSON.stringify(tableData.headers));
  console.log('📋 First few rows:', JSON.stringify(tableData.allRows, null, 2));
  console.log('📋 Matching rows for "' + DOMAIN_TO_FIND + '":', tableData.results.length);

  if (tableData.results.length > 0) {
    console.log('\n✅ Found matching data:');
    for (const match of tableData.results) {
      console.log('  Cells:', JSON.stringify(match.cells));
    }
  }

  // ========== STEP 3: Parse the extracted data ==========
  let extractedData = null;

  if (tableData.results.length > 0) {
    // Get the most recent matching row
    const latestMatch = tableData.results[0];
    const cells = latestMatch.cells;
    const headers = tableData.headers;

    console.log('\n📋 Mapping data to sheet format...');

    // Try to map based on known column positions from the FLM portal
    // Headers: id, ccpa_requestor, ccpa_request, first_name, last_name, email_address, state, primary_phone, city, street_name, apartment_number, zip_code, state, offer_name, created_at
    
    // Find the DB Id (first column is usually 'id')
    const idIndex = headers.findIndex(h => h.toLowerCase() === 'id');
    const requestorIndex = headers.findIndex(h => h.toLowerCase().includes('requestor'));
    const requestIndex = headers.findIndex(h => h.toLowerCase().includes('ccpa_request') && !h.toLowerCase().includes('requestor'));
    
    const dbId = idIndex >= 0 ? cells[idIndex] : cells[0];
    const ccpaRequestor = requestorIndex >= 0 ? cells[requestorIndex] : '';
    const ccpaRequest = requestIndex >= 0 ? cells[requestIndex] : '';

    extractedData = {
      dbId: dbId,
      ccpaRequestor: ccpaRequestor,
      ccpaRequest: ccpaRequest,
      allCells: cells,
      headers: headers
    };

    console.log('  DB Id:', extractedData.dbId);
    console.log('  CCPA Requestor:', extractedData.ccpaRequestor);
    console.log('  All data:', JSON.stringify(cells));
  }

  // ========== STEP 4: Detect Device/OS and Browser from the submission ==========
  // Since we submitted from this machine, we know the details
  const deviceOS = 'Windows';
  const browserName = 'Chrome';
  const pageResult = 'Thankyou';
  const webMail = 'Mail not generated';

  // ========== STEP 5: Append to Google Sheet ==========
  console.log('\n📊 Appending data to Google Sheet...');

  try {
    const auth = new google.auth.GoogleAuth({
      keyFile: 'service_account.json',
      scopes: ['https://www.googleapis.com/auth/spreadsheets']
    });
    const client = await auth.getClient();
    const sheets = google.sheets({ version: 'v4', auth: client });

    // Get current date for the date row in DD/MM/YY format
    const today = new Date();
    const dateStr = `${String(today.getDate()).padStart(2, '0')}/${String(today.getMonth() + 1).padStart(2, '0')}/${String(today.getFullYear()).slice(-2)}`;

    // Check how many rows already exist
    const existing = await sheets.spreadsheets.values.get({
      spreadsheetId: SPREADSHEET_ID,
      range: 'Sheet1!A:A'
    });
    const currentRows = existing.data.values ? existing.data.values.length : 1;

    // Get sheetId for styling
    const meta = await sheets.spreadsheets.get({ spreadsheetId: SPREADSHEET_ID });
    const sheetId = meta.data.sheets[0].properties.sheetId;

    // If this is the first data entry (row 2 = date row)
    if (currentRows <= 1) {
      // Add date row first
      await sheets.spreadsheets.values.append({
        spreadsheetId: SPREADSHEET_ID,
        range: 'Sheet1!A:H',
        valueInputOption: 'USER_ENTERED',
        requestBody: {
          values: [[dateStr, '', '', '', '', '', '', '']]
        }
      });
      console.log('  ✅ Date row added:', dateStr);

      // Style date row - light green background
      await sheets.spreadsheets.batchUpdate({
        spreadsheetId: SPREADSHEET_ID,
        requestBody: {
          requests: [{
            repeatCell: {
              range: { sheetId, startRowIndex: 1, endRowIndex: 2, startColumnIndex: 0, endColumnIndex: 8 },
              cell: {
                userEnteredFormat: {
                  backgroundColor: { red: 0.8, green: 1, blue: 0.8 },
                  textFormat: { bold: true }
                }
              },
              fields: 'userEnteredFormat(backgroundColor,textFormat)'
            }
          }]
        }
      });
    }

    // Append the data row
    const srNo = 1; // First entry
    const domain = 'https://www.1800freshtax.com';
    const ccpaUrl = 'http://www.1800freshtax.com/ccpa/';
    const dbId = extractedData ? extractedData.dbId : 'N/A';

    const rowData = [srNo, domain, ccpaUrl, dbId, deviceOS, browserName, pageResult, webMail];

    await sheets.spreadsheets.values.append({
      spreadsheetId: SPREADSHEET_ID,
      range: 'Sheet1!A:H',
      valueInputOption: 'USER_ENTERED',
      requestBody: {
        values: [rowData]
      }
    });
    console.log('  ✅ Data row appended:', JSON.stringify(rowData));

    // Style the data row - light cyan background
    const dataRowIndex = currentRows <= 1 ? 2 : currentRows;
    await sheets.spreadsheets.batchUpdate({
      spreadsheetId: SPREADSHEET_ID,
      requestBody: {
        requests: [{
          repeatCell: {
            range: { sheetId, startRowIndex: dataRowIndex, endRowIndex: dataRowIndex + 1, startColumnIndex: 0, endColumnIndex: 8 },
            cell: {
              userEnteredFormat: {
                backgroundColor: { red: 0.85, green: 1, blue: 1 },
                borders: {
                  bottom: { style: 'SOLID', color: { red: 0.8, green: 0.8, blue: 0.8 } }
                }
              }
            },
            fields: 'userEnteredFormat(backgroundColor,borders)'
          }
        },
        // Style WebMail column orange if "Mail not generated"
        {
          repeatCell: {
            range: { sheetId, startRowIndex: dataRowIndex, endRowIndex: dataRowIndex + 1, startColumnIndex: 7, endColumnIndex: 8 },
            cell: {
              userEnteredFormat: {
                backgroundColor: { red: 1, green: 0.85, blue: 0.4 },
                textFormat: { bold: true }
              }
            },
            fields: 'userEnteredFormat(backgroundColor,textFormat)'
          }
        }]
      }
    });
    console.log('  ✅ Styling applied!');

    console.log('\n🎉 DONE! Data appended to Google Sheet successfully!');
    console.log('📊 Sheet: https://docs.google.com/spreadsheets/d/' + SPREADSHEET_ID);
  } catch(e) {
    console.error('❌ Google Sheet error:', e.message);
  }

  console.log('\n✅ Browser will close in 30 seconds.');
  await page.waitForTimeout(30000);
  await browser.close();
})();
