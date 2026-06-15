const { processLead } = require('../utils/leadProcessor');
const { chromium } = require('playwright-extra');
const stealth = require('puppeteer-extra-plugin-stealth')();
chromium.use(stealth);

(async () => {
  console.log('🚀 Launching headed verification run for original campaign...');
  const browser = await chromium.launch({ headless: false });
  const context = await browser.newContext();
  const page = await context.newPage();

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
    const result = await processLead(brand, page);
    console.log('\n=======================================');
    console.log('RESULT:', JSON.stringify(result, null, 2));
    console.log('=======================================');
  } catch (e) {
    console.error('FAILED:', e.message);
  } finally {
    await page.waitForTimeout(10000);
    await browser.close();
  }
})();
