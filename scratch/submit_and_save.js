const { chromium } = require('playwright-extra');
const stealth = require('puppeteer-extra-plugin-stealth')();
chromium.use(stealth);
const path = require('path');
const fs = require('fs');

(async () => {
  console.log('🚀 Running submission and dumping HTML...');
  const userDataDir = path.join(__dirname, '..', 'ccpa-browser-profile');
  const context = await chromium.launchPersistentContext(userDataDir, {
    headless: true, // Run headless to be fast
    args: [
      '--disable-blink-features=AutomationControlled',
      '--no-sandbox'
    ],
    viewport: { width: 1280, height: 800 }
  });

  const page = context.pages()[0] || await context.newPage();

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
    console.log('RESULT:', JSON.stringify(result, null, 2));

    // Save final page HTML
    const html = await page.content();
    const htmlPath = path.join(__dirname, '..', 'thankyou_dump.html');
    fs.writeFileSync(htmlPath, html, 'utf8');
    console.log(`✅ Saved thank you page HTML to ${htmlPath}`);

    // Take screenshot
    const screenshotPath = path.join(__dirname, '..', 'thankyou_screenshot.png');
    await page.screenshot({ path: screenshotPath, fullPage: true });
    console.log(`📸 Saved screenshot to ${screenshotPath}`);

  } catch (e) {
    console.error('FAILED:', e.message);
  } finally {
    await context.close();
  }
})();
