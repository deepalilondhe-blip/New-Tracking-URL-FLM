const { chromium } = require('playwright-extra');
const stealth = require('puppeteer-extra-plugin-stealth')();
require('dotenv').config();

process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';
chromium.use(stealth);

(async () => {
  const browser = await chromium.launch({ headless: false });
  const context = await browser.newContext({
    viewport: { width: 1400, height: 900 },
    isMobile: true,
    hasTouch: true,
    userAgent: 'Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Mobile Safari/537.36'
  });
  const page = await context.newPage();

  const url = 'https://tra.com/ccpa-request';
  console.log(`🌐 Navigating to ${url}...`);
  try {
    await page.goto(url, { waitUntil: 'networkidle', timeout: 30000 });
    await page.waitForTimeout(2000);

    console.log('📝 Filling fields...');
    const fnField = await page.$('input[name*="first" i], input[placeholder*="First" i], input[id*="first" i]');
    if (fnField) await fnField.fill('Ckmtestpixel');

    const lnField = await page.$('input[name*="last" i], input[placeholder*="Last" i], input[id*="last" i]');
    if (lnField) await lnField.fill('Ckmtestpixel');

    const streetField = await page.$('input[name*="street" i], input[placeholder*="Street" i], input[id*="street" i]');
    if (streetField) await streetField.fill('Street 1');

    const cityField = await page.$('input[name*="city" i], input[placeholder*="City" i], input[id*="city" i]');
    if (cityField) await cityField.fill('Manhattan');

    const stateSelect = await page.$('select[name*="state" i], select[id*="state" i]');
    if (stateSelect) await stateSelect.selectOption({ label: 'New York' });

    const zipField = await page.$('input[name*="zip" i], input[placeholder*="Zip" i], input[id*="zip" i]');
    if (zipField) await zipField.fill('10020');

    const emailField = await page.$('input[name*="email" i], input[type="email"], input[placeholder*="Email" i], input[id*="email" i]');
    if (emailField) await emailField.fill('ckmtestpixel@gmail.com');

    const phoneField = await page.$('input[name*="phone" i], input[type="tel"], input[placeholder*="Phone" i], input[id*="phone" i]');
    if (phoneField) await phoneField.fill('213-545-0234');

    console.log('📸 Taking screenshot...');
    await page.screenshot({ path: 'scratch/tra_ccpa_test.png', fullPage: true });
    console.log('✅ Fields filled and screenshot saved.');

    console.log('🔘 Clicking submit...');
    const submitBtn = await page.$('button:has-text("Submit"), input[type="submit"], button[type="submit"]');
    if (submitBtn) {
      await submitBtn.click();
      console.log('⏳ Waiting for redirect...');
      await page.waitForTimeout(5000);
      console.log('✅ Final URL:', page.url());
    } else {
      console.log('❌ Submit button not found');
    }

  } catch (e) {
    console.error('❌ Error occurred:', e.message);
  } finally {
    await browser.close();
  }
})();
