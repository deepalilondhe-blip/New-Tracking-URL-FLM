const { chromium } = require('playwright-extra');
const stealth = require('puppeteer-extra-plugin-stealth')();
chromium.use(stealth);
const path = require('path');

(async () => {
  console.log('🚀 Launching typing emulation test for Original campaign...');
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

  try {
    console.log('🔗 Navigating to tracking URL...');
    await page.goto('https://mlf-1800-trk.com/?a=659&oc=337&c=617&s1=', { waitUntil: 'domcontentloaded' });
    await page.waitForLoadState('networkidle');

    console.log('🔘 Setting jQuery slider...');
    await page.evaluate(() => {
      const $ = window.jQuery || window.$;
      if ($ && $.fn && $.fn.slider) {
        $('#slider').slider('value', 500);
        const handle = $('#slider').find('.ui-slider-handle')[0];
        $('#slider').trigger('slide', [{ value: 500, handle: handle }]);
        $('#slider').trigger('slidechange', [{ value: 500, handle: handle }]);
      }
      const taxval = document.querySelector('.taxval, input[name="tax_debt"]');
      if (taxval) {
        taxval.value = '500';
        taxval.dispatchEvent(new Event('change', { bubbles: true }));
      }
    });
    await page.waitForTimeout(1000);

    console.log('🔘 Clicking Next...');
    await page.click('.next-btn1:visible, .btn-next:visible');
    await page.waitForTimeout(2000);

    console.log('🔘 Selecting Option 2: IRS Tax Debt...');
    const options = await page.$$('.choices:visible, .choice:visible');
    if (options.length >= 2) {
      await options[1].click();
    }
    await page.waitForTimeout(2000);

    console.log('🔘 Selecting Option 2: Self-Employed...');
    const options2 = await page.$$('.choices:visible, .choice:visible');
    if (options2.length >= 2) {
      await options2[1].click();
    }
    await page.waitForTimeout(2000);

    console.log('📝 Typing Contact Info with realistic delays...');
    
    const fnField = page.locator('input[name="first_name"]');
    await fnField.click();
    await fnField.pressSequentially('ckmtestpixel', { delay: 100 });
    await page.waitForTimeout(500);

    const lnField = page.locator('input[name="last_name"]');
    await lnField.click();
    await lnField.pressSequentially('ckmtestpixel', { delay: 100 });
    await page.waitForTimeout(500);

    const emailField = page.locator('input[name="email_address"]');
    await emailField.click();
    await emailField.pressSequentially('ckmtestpixel@gmail.com', { delay: 100 });
    await page.waitForTimeout(500);

    // Generate a fresh random phone number to avoid duplicate flagging
    const randomSuffix = String(Math.floor(1000 + Math.random() * 9000));
    const testPhone = `864-289-${randomSuffix}`;
    console.log(`📱 Typing Phone number: ${testPhone}`);
    const phoneField = page.locator('input[name="primary_phone"]');
    await phoneField.click();
    await phoneField.pressSequentially(testPhone, { delay: 100 });
    
    // Press Tab and wait to trigger blur validation scripts
    await page.keyboard.press('Tab');
    console.log('⏳ Waiting 3 seconds for validation to sync...');
    await page.waitForTimeout(3000);

    console.log('🔘 Submitting contact form...');
    const submitBtn = page.locator('.btn-next:visible, .next-btn:visible, button:has-text("NEXT"):visible, button:has-text("Submit"):visible, input[type="submit"]:visible').first();
    await submitBtn.click();

    console.log('⏳ Waiting for thank you page redirection...');
    await page.waitForLoadState('domcontentloaded', { timeout: 15000 }).catch(() => {});
    await page.waitForTimeout(5000);

    const finalUrl = page.url();
    console.log(`\n✅ Final URL: ${finalUrl}`);
    
    // Check if Lead ID is in URL parameters
    const urlObj = new URL(finalUrl);
    const leadId = urlObj.searchParams.get('leadid') || urlObj.searchParams.get('transaction_id') || urlObj.searchParams.get('reqid');
    console.log(`📋 Extracted Lead ID parameter: ${leadId}`);

  } catch (e) {
    console.error('❌ Error during typing test:', e.message);
  } finally {
    await page.waitForTimeout(10000);
    await context.close();
  }
})();
