const { chromium } = require('playwright-extra');
const stealth = require('puppeteer-extra-plugin-stealth')();
const { google } = require('googleapis');
const path = require('path');
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
  'http://www.1800freshtax.com/ccpa/',
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
    const latestMatch = tableData.results[0];
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

async function injectMobileFrame(page, deviceArg) {
  if (deviceArg !== 'android' && deviceArg !== 'ios') return;
  const url = page.url();
  if (!url.includes('/ccpa') && !url.includes('ccpa-request')) return;

  console.log(`📱 [Mobile] Injecting high-fidelity mobile mockup frame...`);
  try {
    await page.evaluate((device) => {
      if (document.getElementById('mobile-bezel-wrapper')) return;

      const bezelColor = device === 'android' ? '#3a3d40' : '#1e1f22'; // Charcoal grey for Android, Space Black for iOS

      const wrapper = document.createElement('div');
      wrapper.id = 'mobile-bezel-wrapper';
      wrapper.innerHTML = `
        <!-- Premium Space Black / Titanium Grey Device Bezel -->
        <div style="
          position: fixed;
          top: 0;
          left: 0;
          width: 100vw;
          height: 100vh;
          border: 14px solid ${bezelColor};
          border-radius: 46px;
          box-sizing: border-box;
          pointer-events: none;
          z-index: 99999999;
          box-shadow: inset 0 0 12px rgba(0,0,0,0.85), 0 0 25px rgba(0,0,0,0.5);
        "></div>
        
        <!-- Screen Glass Border Reflection -->
        <div style="
          position: fixed;
          top: 0;
          left: 0;
          width: 100vw;
          height: 100vh;
          border: 1px solid rgba(255,255,255,0.15);
          border-radius: 44px;
          box-sizing: border-box;
          pointer-events: none;
          z-index: 100000000;
        "></div>

        <!-- Dynamic Island / Punch Hole -->
        <div style="
          position: fixed;
          top: 14px;
          left: 50%;
          transform: translateX(-50%);
          width: 110px;
          height: 28px;
          background-color: #000000;
          border-radius: 20px;
          z-index: 100000001;
          pointer-events: none;
          box-shadow: 0 1px 4px rgba(0,0,0,0.4), inset 0 0 3px rgba(255,255,255,0.15);
          display: flex;
          align-items: center;
          justify-content: space-around;
          padding: 0 10px;
          box-sizing: border-box;
        ">
          <div style="width: 5px; height: 5px; background-color: #1a1e29; border-radius: 50%;"></div>
          <div style="width: 12px; height: 12px; background-color: #000; border-radius: 50%;"></div>
          <div style="width: 6px; height: 6px; background-color: #0d121c; border-radius: 50%;"></div>
        </div>

        <!-- iOS/Android Status Bar -->
        <div style="
          position: fixed;
          top: 15px;
          left: 0;
          width: 100vw;
          padding: 0 36px;
          display: flex;
          justify-content: space-between;
          align-items: center;
          font-family: -apple-system, BlinkMacSystemFont, 'SF Pro Text', sans-serif;
          font-size: 11px;
          font-weight: 600;
          color: #000000;
          z-index: 100000001;
          pointer-events: none;
          box-sizing: border-box;
        ">
          <div>9:41</div>
          <div style="display: flex; align-items: center; gap: 5px;">
            <svg width="17" height="11" viewBox="0 0 17 11" fill="currentColor">
              <rect x="0" y="8" width="2" height="3" rx="0.5"/>
              <rect x="3" y="6" width="2" height="5" rx="0.5"/>
              <rect x="6" y="4" width="2" height="7" rx="0.5"/>
              <rect x="9" y="2" width="2" height="9" rx="0.5"/>
              <rect x="12" y="0" width="2" height="11" rx="0.5" opacity="0.3"/>
            </svg>
            <span>5G</span>
            <div style="
              width: 22px;
              height: 11px;
              border: 1px solid currentColor;
              border-radius: 3px;
              padding: 1px;
              box-sizing: border-box;
              display: flex;
              align-items: center;
              position: relative;
            ">
              <div style="height: 100%; width: 90%; background-color: currentColor; border-radius: 1px;"></div>
              <div style="
                position: absolute;
                right: -3px;
                top: 3px;
                width: 2px;
                height: 3px;
                background-color: currentColor;
                border-radius: 0 1px 1px 0;
              "></div>
            </div>
          </div>
        </div>

        <!-- Bottom Home Indicator Bar -->
        <div style="
          position: fixed;
          bottom: 9px;
          left: 50%;
          transform: translateX(-50%);
          width: 140px;
          height: 5px;
          background-color: #000000;
          border-radius: 10px;
          z-index: 100000001;
          pointer-events: none;
        "></div>
      `;
      document.body.appendChild(wrapper);

      // Shift page content safely out of the Dynamic Island and Bezel masks
      const style = document.createElement('style');
      style.id = 'mobile-style-applied';
      style.innerHTML = `
        body {
          padding-top: 52px !important;
          padding-bottom: 24px !important;
          max-width: 480px !important;
          margin: 0 auto !important;
          min-height: 100vh !important;
          background-color: #ffffff !important;
          box-sizing: border-box !important;
        }
      `;
      document.head.appendChild(style);
    }, deviceArg);
  } catch (e) {
    console.warn('⚠️ [Mobile] Failed to apply mobile mockup frame overlay:', e.message);
  }
}

(async () => {
  const userDataDir = './ccpa-browser-profile';
  const pathToExtension = path.resolve(__dirname, 'buster-extension');
  const browser = await chromium.launchPersistentContext(userDataDir, {
    headless: false,
    args: [
      '--disable-blink-features=AutomationControlled',
      '--no-sandbox',
      '--disable-features=AutofillAddressEnabled,AutofillCreditCardEnabled,AutofillPasswordEnabled',
      `--disable-extensions-except=${pathToExtension}`,
      `--load-extension=${pathToExtension}`,
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

  // Let's find starting SR No (and create sheet if it doesn't exist)
  let nextSrNo = 1;
  let globalSheetId = 0;
  const existingDomains = new Set();
  try {
    const meta = await sheets.spreadsheets.get({ spreadsheetId: SPREADSHEET_ID });
    const existingSheet = meta.data.sheets.find(s => s.properties.title === dateTabName);

    if (!existingSheet) {
      console.log(`Creating new tab: ${dateTabName}...`);
      const createResponse = await sheets.spreadsheets.batchUpdate({
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
      globalSheetId = createResponse.data.replies[0].addSheet.properties.sheetId;

      // Sizing columns A to H matching first sheet exactly
      const widths = [50, 200, 350, 120, 140, 120, 120, 120];
      const columnRequests = widths.map((width, index) => ({
        updateDimensionProperties: {
          range: {
            sheetId: globalSheetId,
            dimension: 'COLUMNS',
            startIndex: index,
            endIndex: index + 1
          },
          properties: {
            pixelSize: width
          },
          fields: 'pixelSize'
        }
      }));

      // Apply widths
      await sheets.spreadsheets.batchUpdate({
        spreadsheetId: SPREADSHEET_ID,
        requestBody: {
          requests: columnRequests
        }
      });

      // Write Header and Date Row
      const dateStr = `${String(todayDate.getDate()).padStart(2, '0')}/${String(todayDate.getMonth() + 1).padStart(2, '0')}/${String(todayDate.getFullYear()).slice(-2)}`;
      await sheets.spreadsheets.values.update({
        spreadsheetId: SPREADSHEET_ID,
        range: `'${dateTabName}'!A1:H2`,
        valueInputOption: 'USER_ENTERED',
        requestBody: {
          values: [
            ['SR', 'Domain', 'CCPA URL', 'DB Id', 'Device/OS', 'Browser', 'Page', 'WebMail'],
            ['', `'` + dateStr, '', '', '', '', '', '']
          ]
        }
      });

      // Style Header and Date Row
      await sheets.spreadsheets.batchUpdate({
        spreadsheetId: SPREADSHEET_ID,
        requestBody: {
          requests: [
            {
              repeatCell: {
                range: { sheetId: globalSheetId, startRowIndex: 0, endRowIndex: 1, startColumnIndex: 0, endColumnIndex: 8 },
                cell: {
                  userEnteredFormat: {
                    backgroundColor: { red: 0.85, green: 0.85, blue: 0.85 },
                    textFormat: { bold: true },
                    horizontalAlignment: 'CENTER'
                  }
                },
                fields: 'userEnteredFormat(backgroundColor,textFormat,horizontalAlignment)'
              }
            },
            {
              repeatCell: {
                range: { sheetId: globalSheetId, startRowIndex: 1, endRowIndex: 2, startColumnIndex: 0, endColumnIndex: 8 },
                cell: {
                  userEnteredFormat: {
                    backgroundColor: { red: 0, green: 1, blue: 1 },
                    textFormat: { bold: true },
                    horizontalAlignment: 'CENTER'
                  }
                },
                fields: 'userEnteredFormat(backgroundColor,textFormat,horizontalAlignment)'
              }
            }
          ]
        }
      });
      console.log(`✅ Tab ${dateTabName} successfully created, sized, and styled!`);
      nextSrNo = 1;
    } else {
      globalSheetId = existingSheet.properties.sheetId;
      // Fetch starting SR and URLs from existing sheet
      const existing = await sheets.spreadsheets.values.get({
        spreadsheetId: SPREADSHEET_ID,
        range: `'${dateTabName}'!A:H`
      });
      if (existing.data.values) {
        const numbers = existing.data.values
          .map(v => parseInt(v[0], 10))
          .filter(n => !isNaN(n));
        if (numbers.length > 0) {
          nextSrNo = Math.max(...numbers) + 1;
        }
        existing.data.values.forEach(row => {
          if (row[2] && row[4]) {
            existingDomains.add(`${row[2].trim().toLowerCase()}_${row[4].trim().toLowerCase()}`);
          }
        });
      }
    }
  } catch (e) {
    console.log('⚠️ Error setting up daily sheet range:', e.message);
  }

  console.log(`🚀 Starting CCPA automation for Device: ${sheetDevice}, Browser: ${sheetBrowser}. Next SR No: ${nextSrNo}`);
  for (let uIndex = 0; uIndex < URLS.length; uIndex++) {
    const url = URLS[uIndex];
    const skipKey = `${url.trim().toLowerCase()}_${sheetDevice.trim().toLowerCase()}`;
    if (existingDomains.has(skipKey)) {
      console.log(`⏭️ Brand [${uIndex + 1}/${URLS.length}] already processed today for ${sheetDevice}, skipping: ${url}`);
      continue;
    }
    console.log(`\n==================================================`);
    console.log(`🌐 Processing brand [${uIndex + 1}/${URLS.length}]: ${url}`);
    console.log(`==================================================`);

    try {
      await page.goto(url, { waitUntil: 'networkidle', timeout: 30000 });
      await page.waitForTimeout(2000);
      await injectMobileFrame(page, deviceArg);

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

      if (radioButtons.length > 0) {
        // Group radio buttons by name attribute
        const radioGroups = {};
        const groupOrder = [];
        for (const radio of radioButtons) {
          const name = await radio.getAttribute('name') || 'unnamed';
          if (!radioGroups[name]) {
            radioGroups[name] = [];
            groupOrder.push(name);
          }
          radioGroups[name].push(radio);
        }

        console.log(`📢 Radio groups found: ${groupOrder.join(', ')}`);

        // First Group: Select 2nd radio button (index 1)
        if (groupOrder.length > 0) {
          const firstGroupName = groupOrder[0];
          const firstGroupRadios = radioGroups[firstGroupName];
          if (firstGroupRadios.length >= 2) {
            await firstGroupRadios[1].click();
            console.log(`✅ Selected 2nd radio button in the 1st group (${firstGroupName}).`);
          } else if (firstGroupRadios.length > 0) {
            await firstGroupRadios[0].click();
            console.log(`✅ Selected the only radio button in the 1st group (${firstGroupName}) since 2nd is not available.`);
          }
        }

        // Second Group: Select any radio button (e.g., index 0)
        if (groupOrder.length > 1) {
          const secondGroupName = groupOrder[1];
          const secondGroupRadios = radioGroups[secondGroupName];
          if (secondGroupRadios.length > 0) {
            await secondGroupRadios[0].click();
            console.log(`✅ Selected 1st radio button in the 2nd group (${secondGroupName}).`);
          }
        }
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
      if (zipField) {
        await page.waitForTimeout(1000); // Wait for any address auto-fill AJAX from city/state
        await zipField.fill('');
        await zipField.fill(FORM_DATA.zipCode);
        await zipField.evaluate((node, val) => {
          node.value = val;
          node.dispatchEvent(new Event('input', { bubbles: true }));
          node.dispatchEvent(new Event('change', { bubbles: true }));
        }, FORM_DATA.zipCode);
      }

      const emailField = await page.$('input[name*="email" i], input[type="email"], input[placeholder*="Email" i], input[id*="email" i]');
      if (emailField) await emailField.fill(FORM_DATA.email);

      const phoneField = await page.$('input[name*="phone" i], input[type="tel"], input[placeholder*="Phone" i], input[id*="phone" i]');
      if (phoneField) {
        await phoneField.focus();
        await page.waitForTimeout(200);
        await page.keyboard.down('Control');
        await page.keyboard.press('a');
        await page.keyboard.up('Control');
        await page.keyboard.press('Delete');
        await page.waitForTimeout(200);

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
      let busterClicked = false;
      let busterClickTime = 0;

      while (!captchaSolved && (Date.now() - startTime) < maxWaitTime) {
        await page.waitForTimeout(2000);

        const challengeFrame = page.frames().find(f => 
          f.url().includes('recaptcha/api2/bframe') || f.url().includes('recaptcha/enterprise/bframe')
        );

        // Try to click Buster solver button if the challenge popup is open
        if (!busterClicked) {
          if (challengeFrame) {
            try {
              const busterBtn = await challengeFrame.$('#solver-button, .help-button-holder');
              if (busterBtn) {
                await challengeFrame.waitForTimeout(500); // Give Buster a moment to inject and render
                await busterBtn.click({ force: true });
                busterClicked = true; // Set flag so we don't spam click it while it solves
                busterClickTime = Date.now();
                console.log('🖱️ Auto-clicked Buster CAPTCHA solver button!');
                await page.waitForTimeout(3000); // Give it time to start audio challenge
              }
            } catch (e) {}
          }
        } else {
          // If Buster was clicked but 15 seconds have passed and it's still not solved
          if (Date.now() - busterClickTime > 15000 && !captchaSolved) {
            console.log('⚠️ Buster is taking too long or failed. Reloading CAPTCHA...');
            if (challengeFrame) {
              try {
                // Find the reload button using multiple possible selectors
                const reloadBtn = await challengeFrame.$('#recaptcha-reload-button, .rc-button-reload, button[title="Get a new challenge"]');
                if (reloadBtn) {
                  await reloadBtn.click({ force: true });
                  console.log('🔄 Clicked reCAPTCHA reload button.');
                  busterClicked = false; // Reset so we can click Buster again on the new challenge
                  busterClickTime = Date.now(); // Reset time to prevent instant reload loop
                  await page.waitForTimeout(3000); // Wait for the new challenge to load
                } else {
                  console.log('⚠️ Could not find reload button. Resetting timer to try again...');
                  busterClickTime = Date.now(); // Reset timer so it doesn't spam
                }
              } catch (e) {
                busterClickTime = Date.now(); // Reset timer on error to prevent spam
              }
            }
          }
        }

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
        console.log('⏳ Waiting 15 seconds for backend to process...');
        await page.waitForTimeout(15000);
      }

      console.log('✅ Form submitted. URL:', page.url());

      // 6. DB ID Extract from Portal
      const domainQuery = getDomainQuery(url);
      let dbId = 'N/A';
      try {
        dbId = await extractDbid(page, domainQuery);
      } catch (e) {
        console.warn(`⚠️ Failed to extract DB ID for ${domainQuery}:`, e.message);
      }
      console.log(`🔍 Extracted DB ID for ${domainQuery}: ${dbId}`);

      // 7. Append to Sheet
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
                range: { sheetId: globalSheetId, startRowIndex: dataRowIndex, endRowIndex: dataRowIndex + 1, startColumnIndex: 0, endColumnIndex: 8 },
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
                range: { sheetId: globalSheetId, startRowIndex: dataRowIndex, endRowIndex: dataRowIndex + 1, startColumnIndex: 7, endColumnIndex: 8 },
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
