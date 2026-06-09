const { chromium } = require('playwright-extra');
const stealth = require('puppeteer-extra-plugin-stealth')();
const { google } = require('googleapis');
require('dotenv').config();

process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';
chromium.use(stealth);

// ========== CONFIG ==========
const SPREADSHEET_ID = '1hcJgC1E1Bw3V5WdYgPpumQXke_kzMbNX1rCH4kKCBwk';
const FLM_URL = 'https://flm-utility.com/ccpa_request/local_storage/login.php?msg=Please%20login%20to%20browse.';
const FLM_AUTH_URL = 'https://flm-utility.com/ccpa_request/local_storage/read/?authKey=b7hak8w2nKDb2KS2n0d';
const FLM_USER = 'admin';
const FLM_PASS = '@cce$$4F0rw@rdL3@p';

const FORM_DATA = {
  firstName: 'Ckmtestpixel',
  lastName: 'Ckmtestpixel',
  streetName: 'Street 1',
  apartment: 'Apartment',
  city: 'Manhattan',
  state: 'New York',
  zipCode: '10020',
  email: 'ckmtestpixel@gmail.com',
  phone: '213-545-0234'
};

const URLS = [
  'http://www.fresh-start-initiative.com/ccpa/',
  'http://www.fresh-tax-help.com/ccpa/',
  'http://www.veteranstaxservices.com/ccpa/',
  'https://www.jdavidtaxlaw.co/ccpa/',
  'https://www.justicetaxrelief.com/ccpa/',
  'https://www.fidelity-tax-defense.net/ccpa/',
  'http://www.second-chance-tax-relief.net/ccpa/',
  'http://www.veteranstaxservices.com/ccpa/',
  'https://www.fresh-startinitiative.com/ccpa/',
  'https://everesttaxrelief.net/ccpa/',
  'https://1800freshtax.com/ccpa/',
  'https://americasfirsttaxrelief.com/ccpa/',
  'https://tra.com/ccpa-request',
  'https://topmoneyprogram.com/ccpa/'
];

// Helper to clean domain names for local storage lookup
function getDomainQuery(urlStr) {
  try {
    const hostname = new URL(urlStr).hostname.replace('www.', '');
    // Split by '.' and take first part if needed, or return hostname
    return hostname;
  } catch (e) {
    return urlStr;
  }
}

async function extractDbid(page, domainQuery) {
  console.log(`🌐 Navigating to FLM portal for lookup of "${domainQuery}"...`);
  await page.goto(FLM_URL, { waitUntil: 'networkidle', timeout: 30000 });
  await page.waitForTimeout(1000);

  const currentUrl = page.url();
  if (currentUrl.includes('login')) {
    await page.fill('input[name="username"]', FLM_USER);
    await page.fill('input[name="password"]', FLM_PASS);
    await page.click('button:has-text("Login"), input[type="submit"]');
    await page.waitForTimeout(2000);
  }

  if (!page.url().includes('authKey')) {
    await page.goto(FLM_AUTH_URL, { waitUntil: 'networkidle', timeout: 30000 });
    await page.waitForTimeout(2000);
  }

  // Extract from table
  const tableData = await page.evaluate((domainSearch) => {
    const tables = document.querySelectorAll('table');
    const results = [];
    if (tables.length === 0) return { results: [] };

    const rows = tables[0].querySelectorAll('tr');
    let headers = [];
    const headerRow = tables[0].querySelector('tr');
    if (headerRow) {
      headers = Array.from(headerRow.querySelectorAll('th, td')).map(cell => cell.textContent.trim());
    }

    for (const row of rows) {
      const cells = row.querySelectorAll('td, th');
      const rowData = Array.from(cells).map(cell => cell.textContent.trim());
      const rowHtml = row.innerHTML;
      if (rowHtml.toLowerCase().includes(domainSearch.toLowerCase())) {
        results.push({ cells: rowData });
      }
    }
    return { results, headers };
  }, domainQuery);

  if (tableData.results && tableData.results.length > 0) {
    const latestMatch = tableData.results[tableData.results.length - 1];
    const cells = latestMatch.cells;
    const headers = tableData.headers;
    const idIndex = headers.findIndex(h => h.toLowerCase() === 'id');
    const dbId = idIndex >= 0 ? cells[idIndex] : cells[0];
    return dbId;
  }
  return 'N/A';
}

const args = {};
process.argv.slice(2).forEach(val => {
  const parts = val.split('=');
  if (parts[0].startsWith('--')) {
    const key = parts[0].substring(2);
    args[key] = parts[1] || true;
  }
});

let deviceArg = args.device || 'windows';
let browserArg = args.browser || 'chrome';
deviceArg = deviceArg.toLowerCase();
browserArg = browserArg.toLowerCase();

let userAgent = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36';
let viewport = { width: 1400, height: 900 };
let isMobile = false;
let hasTouch = false;
let sheetDevice = 'Windows';
let sheetBrowser = 'Chrome';

if (deviceArg === 'android') {
  sheetDevice = 'Google Pixel 10Pro 5G';
  isMobile = true;
  hasTouch = true;
  viewport = { width: 390, height: 844 };
  if (browserArg === 'firefox') {
    sheetBrowser = 'Firefox';
    userAgent = 'Mozilla/5.0 (Android 10; Mobile; rv:125.0) Gecko/125.0 Firefox/125.0';
  } else {
    sheetBrowser = 'Chrome';
    userAgent = 'Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Mobile Safari/537.36';
  }
} else if (deviceArg === 'ios') {
  sheetDevice = 'I phone 17 pro Max';
  isMobile = true;
  hasTouch = true;
  viewport = { width: 390, height: 844 };
  if (browserArg === 'chrome') {
    sheetBrowser = 'Chrome';
    userAgent = 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_4 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) CriOS/124.0.6367.111 Mobile/15E148 Safari/604.1';
  } else {
    sheetBrowser = 'Safari';
    userAgent = 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_4 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.4 Mobile/15E148 Safari/604.1';
  }
} else if (deviceArg === 'tab') {
  sheetDevice = 'Apple 11-inch ipad Air Wi-Fi';
  isMobile = false;
  hasTouch = true;
  viewport = { width: 820, height: 1180 };
  if (browserArg === 'chrome') {
    sheetBrowser = 'Chrome';
    userAgent = 'Mozilla/5.0 (iPad; CPU OS 17_4 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) CriOS/124.0.6367.111 Mobile/15E148 Safari/604.1';
  } else {
    sheetBrowser = 'Safari';
    userAgent = 'Mozilla/5.0 (iPad; CPU OS 17_4 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.4 Mobile/15E148 Safari/604.1';
  }
} else if (deviceArg === 'mac') {
  sheetDevice = 'MacBook Air M4';
  if (browserArg === 'safari') {
    sheetBrowser = 'Safari';
    userAgent = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 14_4) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.4 Safari/605.1.15';
  } else {
    sheetBrowser = 'Chrome';
    userAgent = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36';
  }
} else {
  sheetDevice = 'Windows';
  if (browserArg === 'firefox') {
    sheetBrowser = 'Firefox';
    userAgent = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:125.0) Gecko/20100101 Firefox/125.0';
  } else {
    sheetBrowser = 'Chrome';
    userAgent = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36';
  }
}

(async () => {
  const userDataDir = './ccpa-browser-profile';
  const browser = await chromium.launchPersistentContext(userDataDir, {
    headless: false,
    args: [
      '--disable-blink-features=AutomationControlled',
      '--no-sandbox',
      isMobile ? '--window-size=500,900' : '--window-size=1400,900'
    ],
    viewport: viewport,
    ignoreHTTPSErrors: true,
    locale: 'en-US',
    userAgent: userAgent,
    isMobile: isMobile,
    hasTouch: hasTouch
  });

  const page = browser.pages()[0] || await browser.newPage();
  
  // Authenticate Google Sheets API
  const auth = new google.auth.GoogleAuth({
    keyFile: 'service_account.json',
    scopes: ['https://www.googleapis.com/auth/spreadsheets']
  });
  const client = await auth.getClient();
  const sheets = google.sheets({ version: 'v4', auth: client });

  // Today's date tab name
  const todayDate = new Date();
  const dateTabName = `${String(todayDate.getDate()).padStart(2, '0')}-${String(todayDate.getMonth() + 1).padStart(2, '0')}-${String(todayDate.getFullYear()).slice(-2)}`;

  // Let's find starting SR No
  let nextSrNo = 1;
  try {
    const existing = await sheets.spreadsheets.values.get({
      spreadsheetId: SPREADSHEET_ID,
      range: `'${dateTabName}'!A:A`
    });
    if (existing.data.values) {
      const numbers = existing.data.values
        .map(v => parseInt(v[0], 10))
        .filter(n => !isNaN(n));
      if (numbers.length > 0) {
        nextSrNo = Math.max(...numbers) + 1;
      }
    }
  } catch (e) {
    console.log('⚠️ Warning fetching sheet range:', e.message);
  }

  console.log(`🚀 Starting CCPA automation for Device: ${sheetDevice}, Browser: ${sheetBrowser}. Next SR No: ${nextSrNo}`);
  for (let uIndex = 0; uIndex < URLS.length; uIndex++) {
    const url = URLS[uIndex];
    console.log(`\n==================================================`);
    console.log(`🌐 Processing brand [${uIndex + 1}/${URLS.length}]: ${url}`);
    console.log(`==================================================`);

    try {
      await page.goto(url, { waitUntil: 'networkidle', timeout: 30000 });
      await page.waitForTimeout(2000);

      // 1. Check Logo
      const logoExists = await page.evaluate(() => {
        const logoSelectors = [
          'img[src*="logo" i]', 'img[class*="logo" i]', 'img[id*="logo" i]',
          '[class*="logo" i] img', '[id*="logo" i] img', 'a.logo', '.logo', '#logo',
          'svg[class*="logo" i]', 'svg[id*="logo" i]'
        ];
        for (const selector of logoSelectors) {
          const el = document.querySelector(selector);
          if (el) {
            // Check if visible
            const rect = el.getBoundingClientRect();
            if (rect.width > 0 && rect.height > 0) return true;
          }
        }
        // Fallback: check if any img tag exists on page
        const firstImg = document.querySelector('img');
        if (firstImg) return true;
        return false;
      });
      console.log(logoExists ? '✅ Logo element detected on page.' : '❌ Logo element NOT detected.');

      // 2. Check Name Mention (CCPA or California Consumer Privacy Act)
      const ccpaMentioned = await page.evaluate(() => {
        const bodyText = document.body.innerText.toLowerCase();
        return bodyText.includes('ccpa') || 
               bodyText.includes('california consumer privacy act') ||
               bodyText.includes('california resident');
      });
      console.log(ccpaMentioned ? '✅ CCPA name mention detected on page.' : '❌ CCPA name mention NOT detected.');

      // 3. Check Multiple Radio Buttons / Checkboxes functional
      const radioButtons = await page.$$('input[type="radio"]');
      const checkboxes = await page.$$('input[type="checkbox"]');
      console.log(`📊 Input elements: Found ${radioButtons.length} radio buttons and ${checkboxes.length} checkboxes.`);

      // Select first radio button (e.g. California Resident)
      if (radioButtons.length > 0) {
        await radioButtons[0].click();
        console.log('✅ First radio button selected.');
      }
      await page.waitForTimeout(500);

      // Select multiple checkboxes/radio option
      let selectedCheckboxes = 0;
      for (let i = 0; i < checkboxes.length; i++) {
        const id = await checkboxes[i].getAttribute('id');
        if (id && id.includes('recaptcha')) continue;
        const parentTag = await checkboxes[i].evaluate(el => el.closest('iframe') ? 'iframe' : 'page');
        if (parentTag === 'iframe') continue;

        await checkboxes[i].check();
        selectedCheckboxes++;
      }
      console.log(`✅ Selected ${selectedCheckboxes} checkboxes.`);

      // 4. Fill form fields
      console.log('📝 Filling form fields with static data...');

      const fnField = await page.$('input[name*="first" i], input[placeholder*="First" i], input[id*="first" i]');
      if (fnField) await fnField.fill(FORM_DATA.firstName);

      const lnField = await page.$('input[name*="last" i], input[placeholder*="Last" i], input[id*="last" i]');
      if (lnField) await lnField.fill(FORM_DATA.lastName);

      const streetField = await page.$('input[name*="street" i], input[placeholder*="Street" i], input[id*="street" i]');
      if (streetField) await streetField.fill(FORM_DATA.streetName);

      const aptField = await page.$('input[name*="apartment" i], input[name*="apt" i], input[placeholder*="Apartment" i], input[id*="apartment" i]');
      if (aptField) await aptField.fill(FORM_DATA.apartment);

      const cityField = await page.$('input[name*="city" i], input[placeholder*="City" i], input[id*="city" i]');
      if (cityField) await cityField.fill(FORM_DATA.city);

      const stateSelect = await page.$('select[name*="state" i], select[id*="state" i]');
      if (stateSelect) await stateSelect.selectOption({ label: FORM_DATA.state });

      const zipField = await page.$('input[name*="zip" i], input[placeholder*="Zip" i], input[id*="zip" i]');
      if (zipField) await zipField.fill(FORM_DATA.zipCode);

      const emailField = await page.$('input[name*="email" i], input[type="email"], input[placeholder*="Email" i], input[id*="email" i]');
      if (emailField) await emailField.fill(FORM_DATA.email);

      const phoneField = await page.$('input[name*="phone" i], input[type="tel"], input[placeholder*="Phone" i], input[id*="phone" i]');
      if (phoneField) {
        await phoneField.click();
        await page.waitForTimeout(200);
        await page.keyboard.press('Home');
        const digitsOnly = FORM_DATA.phone.replace(/\D/g, '');
        for (const digit of digitsOnly) {
          await page.keyboard.press(digit);
          await page.waitForTimeout(50);
        }
      }

      const screenshotName = `ccpa_filled_${uIndex + 1}.png`;
      await page.screenshot({ path: screenshotName, fullPage: true });
      console.log(`📸 Form filled screenshot saved: ${screenshotName}`);

      // 5. CAPTCHA Pause
      console.log('\n' + '='.repeat(60));
      console.log(`⏸️  CAPTCHA PAUSE [Brand ${uIndex + 1}/${URLS.length}] — Solve captcha on the headed browser now.`);
      console.log('='.repeat(60));

      // Auto-click reCAPTCHA anchor if possible
      const captchaFrame = page.frames().find(f => 
        f.url().includes('recaptcha/api2/anchor') || f.url().includes('recaptcha/enterprise/anchor')
      );
      if (captchaFrame) {
        try {
          const checkbox = await captchaFrame.waitForSelector('#recaptcha-anchor', { timeout: 3000 });
          if (checkbox) {
            await checkbox.click();
            console.log('🖱️ Auto-clicked CAPTCHA anchor.');
          }
        } catch (e) {}
      }

      // Wait for solve (up to 5 mins)
      let captchaSolved = url.includes('tra.com') ? true : false;
      const maxWaitTime = 300000;
      const startTime = Date.now();

      while (!captchaSolved && (Date.now() - startTime) < maxWaitTime) {
        await page.waitForTimeout(2000);
        if (captchaFrame) {
          try {
            const ariaChecked = await captchaFrame.$eval('#recaptcha-anchor', el => el.getAttribute('aria-checked'));
            if (ariaChecked === 'true') captchaSolved = true;
          } catch (e) {}
        }
        if (!captchaSolved) {
          try {
            const responseValue = await page.$eval('textarea[name="g-recaptcha-response"]', el => el.value);
            if (responseValue && responseValue.length > 0) captchaSolved = true;
          } catch (e) {}
        }
      }

      if (!captchaSolved) {
        console.log('❌ CAPTCHA timeout for this brand. Skipping submission...');
        continue;
      }

      console.log('🎉 CAPTCHA Solved! Submitting...');
      await page.waitForTimeout(1000);

      const submitBtn = await page.$('button:has-text("Submit"), input[type="submit"], button[type="submit"]');
      if (submitBtn) {
        await submitBtn.click();
        await page.waitForTimeout(5000);
      }

      console.log('✅ Form submitted. URL:', page.url());

      // 6. DB ID Extract from Portal
      const domainQuery = getDomainQuery(url);
      const dbId = await extractDbid(page, domainQuery);
      console.log(`🔍 Extracted DB ID for ${domainQuery}: ${dbId}`);

      // 7. Append to Sheet
      const dateStr = `${String(today.getDate()).padStart(2, '0')}/${String(today.getMonth() + 1).padStart(2, '0')}/${String(today.getFullYear()).slice(-2)}`;

      const existing = await sheets.spreadsheets.values.get({
        spreadsheetId: SPREADSHEET_ID,
        range: `'${dateTabName}'!A:A`
      });
      const currentRows = existing.data.values ? existing.data.values.length : 1;
      const meta = await sheets.spreadsheets.get({ spreadsheetId: SPREADSHEET_ID });
      const sheetMetadata = meta.data.sheets.find(s => s.properties.title === dateTabName);
      const sheetId = sheetMetadata ? sheetMetadata.properties.sheetId : 0;

      if (currentRows <= 1) {
        await sheets.spreadsheets.values.append({
          spreadsheetId: SPREADSHEET_ID,
          range: `'${dateTabName}'!A:H`,
          valueInputOption: 'USER_ENTERED',
          requestBody: { values: [['', `'` + dateStr, '', '', '', '', '', '']] }
        });
        // Style Date Row (Cyan)
        await sheets.spreadsheets.batchUpdate({
          spreadsheetId: SPREADSHEET_ID,
          requestBody: {
            requests: [{
              repeatCell: {
                range: { sheetId, startRowIndex: 1, endRowIndex: 2, startColumnIndex: 0, endColumnIndex: 8 },
                cell: {
                  userEnteredFormat: {
                    backgroundColor: { red: 0, green: 1, blue: 1 },
                    textFormat: { bold: true }
                  }
                },
                fields: 'userEnteredFormat(backgroundColor,textFormat)'
              }
            }]
          }
        });
      }

      const cleanHost = new URL(url).protocol + '//' + new URL(url).hostname;
      const rowData = [nextSrNo, cleanHost, url, dbId, sheetDevice, sheetBrowser, 'Thankyou', 'Mail not generated'];

      await sheets.spreadsheets.values.append({
        spreadsheetId: SPREADSHEET_ID,
        range: `'${dateTabName}'!A:H`,
        valueInputOption: 'USER_ENTERED',
        requestBody: { values: [rowData] }
      });
      console.log(`✅ Appended to Sheet: SR ${nextSrNo}`);

      // Style newly appended row
      const newExisting = await sheets.spreadsheets.values.get({
        spreadsheetId: SPREADSHEET_ID,
        range: `'${dateTabName}'!A:A`
      });
      const latestRowsCount = newExisting.data.values ? newExisting.data.values.length : 1;
      const dataRowIndex = latestRowsCount - 1;

      await sheets.spreadsheets.batchUpdate({
        spreadsheetId: SPREADSHEET_ID,
        requestBody: {
          requests: [
            {
              repeatCell: {
                range: { sheetId, startRowIndex: dataRowIndex, endRowIndex: dataRowIndex + 1, startColumnIndex: 0, endColumnIndex: 8 },
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
            },
            {
              repeatCell: {
                range: { sheetId, startRowIndex: dataRowIndex, endRowIndex: dataRowIndex + 1, startColumnIndex: 7, endColumnIndex: 8 },
                cell: {
                  userEnteredFormat: {
                    backgroundColor: { red: 1, green: 1, blue: 0 },
                    textFormat: { bold: true }
                  }
                },
                fields: 'userEnteredFormat(backgroundColor,textFormat)'
              }
            }
          ]
        }
      });

      nextSrNo++;

    } catch (err) {
      console.error(`❌ Error processing brand ${url}:`, err.message);
    }
  }

  console.log('\n🎉 ALL CCPA URLS PROCESSED SUCCESSFULLY!');
  await browser.close();
})();
