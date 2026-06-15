const { chromium } = require('playwright-extra');
const stealth = require('puppeteer-extra-plugin-stealth')();
const path = require('path');
chromium.use(stealth);

(async () => {
  const userDataDir = './ccpa-browser-profile';
  const pathToExtension = path.resolve(__dirname, 'buster-extension');
  
  console.log('\n======================================================');
  console.log('🌐 Opening Browser Profile to log in to Google...');
  console.log('======================================================\n');
  
  const browser = await chromium.launchPersistentContext(userDataDir, {
    headless: false,
    args: [
      '--disable-blink-features=AutomationControlled',
      '--no-sandbox',
      `--disable-extensions-except=${pathToExtension}`,
      `--load-extension=${pathToExtension}`,
      '--window-size=1200,800'
    ],
    viewport: { width: 1200, height: 800 }
  });

  const page = browser.pages()[0] || await browser.newPage();
  
  // Go to Gmail login
  await page.goto('https://accounts.google.com/ServiceLogin', { waitUntil: 'networkidle' });
  
  console.log('👉 ACTION REQUIRED:');
  console.log('1. Log in to your Gmail / Google account in the opened browser window.');
  console.log('2. Once you are successfully logged in, close the browser window.');
  console.log('3. Google will save the login session cookies into your "./ccpa-browser-profile" folder.');
})();
