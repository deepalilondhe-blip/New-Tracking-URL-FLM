const { chromium } = require('playwright-extra');
const stealth = require('puppeteer-extra-plugin-stealth')();
chromium.use(stealth);
const path = require('path');

(async () => {
  console.log('🚀 Launching network audit to log ALL requests...');
  const userDataDir = path.join(__dirname, '..', 'ccpa-browser-profile');
  
  const context = await chromium.launchPersistentContext(userDataDir, {
    headless: false,
    args: [
      '--disable-blink-features=AutomationControlled',
      '--no-sandbox',
    ],
    viewport: { width: 1280, height: 800 }
  });

  const page = context.pages()[0] || await context.newPage();

  // Listen to network requests
  page.on('request', request => {
    const url = request.url();
    const method = request.method();
    // Ignore static assets to keep logs clean
    if (url.match(/\.(png|jpg|jpeg|gif|css|svg|woff2|woff|ttf)$/i)) return;
    console.log(`[REQ] ${method} ${url}`);
  });

  const brand = {
    id: "original",
    name: "Original",
    url: "https://mlf-1800-trk.com/?a=659&oc=337&c=617&s1=",
    sheet: "Original",
    sliderAmount: "500",
    state: "Colorado",
    phone: "303-447-3376"
  };

  try {
    const { processLead } = require('../utils/leadProcessor');
    const result = await processLead(brand, page);
    console.log('\n=======================================');
    console.log('RESULT:', JSON.stringify(result, null, 2));
    console.log('=======================================');
  } catch (e) {
    console.error('FAILED:', e.message);
  } finally {
    await page.waitForTimeout(10000);
    await context.close();
  }
})();
