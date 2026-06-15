const { chromium } = require('playwright-extra');
const stealth = require('puppeteer-extra-plugin-stealth')();
chromium.use(stealth);
const path = require('path');

(async () => {
  console.log('🚀 Launching headed verification run for original campaign with stealth flags...');
  const userDataDir = path.join(__dirname, '..', 'ccpa-browser-profile');
  
  // Launch with persistent context and anti-bot flags
  const context = await chromium.launchPersistentContext(userDataDir, {
    headless: true,
    args: [
      '--disable-blink-features=AutomationControlled',
      '--no-sandbox',
      '--disable-features=AutofillAddressEnabled,AutofillCreditCardEnabled,AutofillPasswordEnabled'
    ],
    viewport: { width: 1280, height: 800 }
  });

  const page = context.pages()[0] || await context.newPage();

  const brand = {
    id: "original",
    name: "Original",
    url: "https://mlf-1800-trk.com/?a=659&oc=337&c=617&s1=",
    sheet: "Original",
    sliderAmount: "60000",
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
