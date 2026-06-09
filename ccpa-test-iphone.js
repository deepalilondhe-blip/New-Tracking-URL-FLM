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

const TEST_URL = 'https://1800freshtax.com/ccpa/';
const deviceName = 'I phone 17 pro Max';
const browserName = 'Safari';
const userAgent = 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_4 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.4 Mobile/15E148 Safari/604.1';

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
    return idIndex >= 0 ? cells[idIndex] : cells[0];
  }
  return 'N/A';
}

(async () => {
  const userDataDir = './ccpa-browser-profile';
  const browser = await chromium.launchPersistentContext(userDataDir, {
    headless: false,
    args: [
      '--disable-blink-features=AutomationControlled',
      '--no-sandbox',
      '--window-size=500,900'
    ],
    viewport: { width: 393, height: 852 },
    deviceScaleFactor: 3,
    ignoreHTTPSErrors: true,
    locale: 'en-US',
    userAgent: userAgent,
    isMobile: true,
    hasTouch: true
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

  console.log(`🚀 Starting single URL iPhone test. Next SR No: ${nextSrNo}`);

  try {
    await page.goto(TEST_URL, { waitUntil: 'networkidle', timeout: 30000 });
    await page.waitForTimeout(2000);

    // Inject high-fidelity pink iPhone mockup frame
    await page.evaluate(() => {
      if (document.getElementById('iphone-bezel-wrapper')) return;

      const wrapper = document.createElement('div');
      wrapper.id = 'iphone-bezel-wrapper';
      wrapper.innerHTML = `
        <!-- Pink Titanium Device Frame Bezel Overlay -->
        <div style="
          position: fixed;
          top: 0;
          left: 0;
          width: 100vw;
          height: 100vh;
          border: 14px solid #ff69b4; /* Pink Titanium */
          border-radius: 46px;
          box-sizing: border-box;
          pointer-events: none;
          z-index: 99999999;
          box-shadow: inset 0 0 12px rgba(0,0,0,0.85), 0 0 25px rgba(255, 105, 180, 0.4);
        "></div>
        
        <!-- Screen Glass Border Reflection -->
        <div style="
          position: fixed;
          top: 0;
          left: 0;
          width: 100vw;
          height: 100vh;
          border: 1px solid rgba(255,255,255,0.20);
          border-radius: 44px;
          box-sizing: border-box;
          pointer-events: none;
          z-index: 100000000;
        "></div>

        <!-- Dynamic Island -->
        <div style="
          position: fixed;
          top: 14px;
          left: 50%;
          transform: translateX(-50%);
          width: 115px;
          height: 30px;
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
          <div style="width: 5px; height: 5px; background-color: #1a1e29; border-radius: 50%; box-shadow: inset 0 0 2px #000;"></div>
          <div style="width: 12px; height: 12px; background-color: #000; border-radius: 50%;"></div>
          <div style="width: 6px; height: 6px; background-color: #0d121c; border-radius: 50%;"></div>
        </div>

        <!-- iOS Status Bar -->
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
          <div>11:27</div>
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
              <div style="height: 100%; width: 86%; background-color: currentColor; border-radius: 1px;"></div>
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

      const style = document.createElement('style');
      style.innerHTML = `
        body {
          padding-top: 52px !important;
          padding-bottom: 24px !important;
          box-sizing: border-box !important;
        }
      `;
      document.head.appendChild(style);
    });
    await page.waitForTimeout(1000);

    // 1. Verify Logo
    const logoExists = await page.evaluate(() => {
      const logoSelectors = [
        'img[src*="logo" i]', 'img[class*="logo" i]', 'img[id*="logo" i]',
        'a.logo', '.logo', '#logo'
      ];
      for (const selector of logoSelectors) {
        const el = document.querySelector(selector);
        if (el && el.getBoundingClientRect().width > 0) return true;
      }
      return !!document.querySelector('img');
    });
    console.log(logoExists ? '✅ Logo element detected.' : '❌ Logo element NOT detected.');

    // 2. Verify CCPA Mention
    const ccpaMentioned = await page.evaluate(() => {
      const text = document.body.innerText.toLowerCase();
      return text.includes('ccpa') || text.includes('california');
    });
    console.log(ccpaMentioned ? '✅ CCPA mention detected.' : '❌ CCPA mention NOT detected.');

    // 3. Interchange radio buttons (Select 1st option - California Resident)
    const radioButtons = await page.$$('input[type="radio"]');
    console.log(`Found ${radioButtons.length} radio buttons.`);
    if (radioButtons.length > 0) {
      await radioButtons[0].click(); // Select 1st radio button
      console.log('✅ 1st radio button selected (Interchanged selection).');
    }

    // 4. Select checkboxes
    const checkboxes = await page.$$('input[type="checkbox"]');
    console.log(`Found ${checkboxes.length} checkboxes.`);
    let checkedCount = 0;
    for (let i = 0; i < checkboxes.length; i++) {
      const id = await checkboxes[i].getAttribute('id');
      if (id && id.includes('recaptcha')) continue;
      const isIframe = await checkboxes[i].evaluate(el => el.closest('iframe') ? 'yes' : 'no');
      if (isIframe === 'yes') continue;

      await checkboxes[i].check();
      checkedCount++;
    }
    console.log(`✅ Selected total of ${checkedCount} checkboxes.`);

    // 5. Fill Form fields
    console.log('📝 Filling form fields with static data...');
    const fnField = await page.$('input[name*="first" i]');
    if (fnField) await fnField.fill(FORM_DATA.firstName);

    const lnField = await page.$('input[name*="last" i]');
    if (lnField) await lnField.fill(FORM_DATA.lastName);

    const streetField = await page.$('input[name*="street" i]');
    if (streetField) await streetField.fill(FORM_DATA.streetName);

    const aptField = await page.$('input[name*="apartment" i]');
    if (aptField) await aptField.fill(FORM_DATA.apartment);

    const cityField = await page.$('input[name*="city" i]');
    if (cityField) await cityField.fill(FORM_DATA.city);

    const stateSelect = await page.$('select[name*="state" i]');
    if (stateSelect) await stateSelect.selectOption({ label: FORM_DATA.state });

    const zipField = await page.$('input[name*="zip" i]');
    if (zipField) await zipField.fill(FORM_DATA.zipCode);

    const emailField = await page.$('input[type="email"]');
    if (emailField) await emailField.fill(FORM_DATA.email);

    const phoneField = await page.$('input[type="tel"], input[name*="phone" i]');
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

    const screenshotName = `ccpa_filled_iphone_test.png`;
    await page.screenshot({ path: screenshotName, fullPage: false });
    console.log(`📸 Form filled screenshot saved: ${screenshotName}`);

    // 6. CAPTCHA Pause
    console.log('\n' + '='.repeat(60));
    console.log(`⏸️  CAPTCHA PAUSE — Please solve the CAPTCHA manually in the headed browser!`);
    console.log('='.repeat(60));

    // Auto-click reCAPTCHA anchor
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

    // Wait for solve
    let captchaSolved = false;
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
      console.log('❌ CAPTCHA timeout. Exiting...');
      await browser.close();
      return;
    }

    console.log('🎉 CAPTCHA Solved! Submitting...');
    await page.waitForTimeout(1000);

    const submitBtn = await page.$('button:has-text("Submit"), input[type="submit"], button[type="submit"]');
    if (submitBtn) {
      await submitBtn.click();
      await page.waitForTimeout(5000);
    }

    console.log('✅ Form submitted. URL:', page.url());

    // 7. DB ID Extract
    const domainQuery = '1800freshtax';
    const dbId = await extractDbid(page, domainQuery);
    console.log(`🔍 Extracted DB ID for ${domainQuery}: ${dbId}`);

    // 8. Append to Sheet
    const cleanHost = new URL(TEST_URL).protocol + '//' + new URL(TEST_URL).hostname;
    const rowData = [nextSrNo, cleanHost, TEST_URL, dbId, deviceName, browserName, 'Thankyou', 'Mail not generated'];

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
    const meta = await sheets.spreadsheets.get({ spreadsheetId: SPREADSHEET_ID });
    const sheetMetadata = meta.data.sheets.find(s => s.properties.title === dateTabName);
    const sheetId = sheetMetadata ? sheetMetadata.properties.sheetId : 0;

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

    console.log('🎉 Done! Append and styling complete.');

  } catch (err) {
    console.error('❌ Error processing test:', err.message);
  }

  await page.waitForTimeout(5000);
  await browser.close();
})();
