const { chromium } = require('playwright-extra');
const stealth = require('puppeteer-extra-plugin-stealth')();
require('dotenv').config();

process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';
chromium.use(stealth);

const FLM_URL = 'https://flm-utility.com/ccpa_request/local_storage/login.php?msg=Please%20login%20to%20browse.';
const FLM_AUTH_URL = 'https://flm-utility.com/ccpa_request/local_storage/read/?authKey=b7hak8w2nKDb2KS2n0d';
const FLM_USER = 'admin';
const FLM_PASS = '@cce$$4F0rw@rdL3@p';

(async () => {
  const userDataDir = './ccpa-browser-profile';
  const browser = await chromium.launchPersistentContext(userDataDir, {
    headless: false,
    args: ['--disable-blink-features=AutomationControlled', '--no-sandbox']
  });

  const page = browser.pages()[0] || await browser.newPage();

  console.log('🌐 Navigating to FLM portal...');
  await page.goto(FLM_URL, { waitUntil: 'networkidle', timeout: 30000 });
  await page.waitForTimeout(1000);

  const currentUrl = page.url();
  if (currentUrl.includes('login')) {
    await page.fill('input[name="username"]', FLM_USER);
    await page.fill('input[name="password"]', FLM_PASS);
    await page.click('button:has-text("Login"), input[type="submit"]');
    await page.waitForTimeout(2000);
  }

  await page.goto(FLM_AUTH_URL, { waitUntil: 'networkidle', timeout: 30000 });
  await page.waitForTimeout(2000);

  // Take full page screenshot of the portal data
  await page.screenshot({ path: 'flm_portal_debug.png', fullPage: true });
  console.log('📸 Saved flm_portal_debug.png');

  // Check if there is any row matching 'tra'
  const matches = await page.evaluate(() => {
    const rows = Array.from(document.querySelectorAll('tr'));
    return rows.map(r => r.textContent.trim()).filter(text => text.toLowerCase().includes('tra'));
  });
  console.log('Matches for "tra":', JSON.stringify(matches, null, 2));

  await browser.close();
})();
