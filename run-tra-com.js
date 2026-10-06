/**
 * ====================================================================
 * 🚀 DEDICATED HEADED FORM RUNNER FOR TRA.COM
 * ====================================================================
 * Standalone test script for https://tra.com/
 * - Runs in VISIBLE (headed) mode with realistic delays
 * - Submits form only (NO Google Sheets, NO Cake API, NO external reporting APIs)
 * - Uses exact requested test credentials:
 *     First Name: CKMTESTPIXEL
 *     Last Name:  CKMTESTPIXEL
 *     Email:      ckmtestpixel@gmail.com
 *     Phone:      Valid US Phone matching state
 */

const { chromium } = require('playwright-extra');
const stealth = require('puppeteer-extra-plugin-stealth')();
chromium.use(stealth);

const path = require('path');
const fs = require('fs');
const { generateStateDummyPhone } = require('./utils/phoneHelper');

(async () => {
  const isHeadless = process.argv.includes('--headless') || process.env.HEADLESS === 'true';
  const modeLabel = isHeadless ? 'HEADLESS (Background)' : 'HEADED (Visible Browser)';

  console.log('\n====================================================================');
  console.log(`🚀 LAUNCHING ${isHeadless ? 'HEADLESS' : 'HEADED'} TEST RUN FOR: https://tra.com/`);
  console.log('📋 Credentials:');
  console.log('   • First Name: CKMTESTPIXEL');
  console.log('   • Last Name:  CKMTESTPIXEL');
  console.log('   • Email:      ckmtestpixel@gmail.com');
  console.log(`   • Mode:       ${modeLabel}`);
  console.log('   • Scope:      Form Submission Only (No APIs/Sheets)');
  console.log('====================================================================\n');

  const selectedState = 'California';
  const dummyPhone = generateStateDummyPhone(selectedState, Math.floor(Math.random() * 500));
  const sliderAmount = 15000;

  console.log(`📍 State Selected:  ${selectedState}`);
  console.log(`📞 Phone Number:    ${dummyPhone}`);
  console.log(`💰 Debt Amount:     $${sliderAmount.toLocaleString()}`);

  const browser = await chromium.launch({
    headless: isHeadless,
    slowMo: isHeadless ? 50 : 600, // Slow motion so each interaction is clearly visible in headed mode
    args: [
      '--start-maximized',
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-blink-features=AutomationControlled'
    ]
  });

  const context = await browser.newContext({
    viewport: isHeadless ? { width: 1920, height: 1080 } : null,
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36'
  });

  const page = await context.newPage();

  try {
    // -------------------------------------------------------------
    // Step 0: Navigate to tra.com
    // -------------------------------------------------------------
    console.log('\n🌐 [1/7] Navigating to https://tra.com/ ...');
    await page.goto('https://tra.com/', { waitUntil: 'domcontentloaded', timeout: 30000 });
    await page.waitForTimeout(1500);
    console.log('✅ Page loaded:', await page.title());

    // -------------------------------------------------------------
    // Step 1: Debt Slider
    // -------------------------------------------------------------
    console.log('\n🔘 [2/7] Step 1: Setting Tax Debt Amount...');
    await page.waitForSelector('.next-btn1', { timeout: 10000 });

    // Set slider value via jQuery UI if available, or update hidden input directly
    await page.evaluate((amt) => {
      const $ = window.jQuery || window.$;
      if ($ && $.fn && $.fn.slider && $('#slider2').length) {
        $('#slider2').slider('value', amt);
        const handle = $('#slider2').find('.ui-slider-handle')[0];
        $('#slider2').trigger('slide', [{ value: amt, handle: handle }]);
        $('#slider2').trigger('slidechange', [{ value: amt, handle: handle }]);
      }
      const taxInput = document.querySelector('#tax_debt, input[name="tax_debt"]');
      if (taxInput) {
        taxInput.value = amt;
        taxInput.dispatchEvent(new Event('change', { bubbles: true }));
      }
      const pricePicker = document.querySelector('.price-picker');
      if (pricePicker) {
        pricePicker.textContent = '$' + amt.toLocaleString();
      }
    }, sliderAmount);

    console.log(`✅ Set debt amount to $${sliderAmount.toLocaleString()}`);
    await page.waitForTimeout(800);

    console.log('👉 Clicking Next (Step 1 -> Step 2)...');
    await page.click('.next-btn1');
    await page.waitForTimeout(1000);

    // -------------------------------------------------------------
    // Step 2: State Selection
    // -------------------------------------------------------------
    console.log('\n🔘 [3/7] Step 2: Selecting State...');
    await page.waitForSelector('select#state', { state: 'visible', timeout: 8000 });
    await page.selectOption('select#state', { label: selectedState });
    console.log(`✅ Selected State: ${selectedState}`);
    await page.waitForTimeout(800);

    console.log('👉 Clicking Next (Step 2 -> Step 3)...');
    await page.click('.next-btn2');
    await page.waitForTimeout(1000);

    // -------------------------------------------------------------
    // Step 3: Name
    // -------------------------------------------------------------
    console.log('\n🔘 [4/7] Step 3: Entering Name Credentials...');
    await page.waitForSelector('input#first_name', { state: 'visible', timeout: 8000 });
    await page.fill('input#first_name', 'CKMTESTPIXEL');
    await page.waitForTimeout(400);
    await page.fill('input#last_name', 'CKMTESTPIXEL');
    console.log('✅ Name entered: CKMTESTPIXEL CKMTESTPIXEL');
    await page.waitForTimeout(800);

    console.log('👉 Clicking Next (Step 3 -> Step 4)...');
    await page.click('.next-btn3');
    await page.waitForTimeout(1000);

    // -------------------------------------------------------------
    // Step 4: Email Address & Opt-in Checkbox
    // -------------------------------------------------------------
    console.log('\n🔘 [5/7] Step 4: Entering Email...');
    await page.waitForSelector('input#email_address', { state: 'visible', timeout: 8000 });
    await page.fill('input#email_address', 'ckmtestpixel@gmail.com');
    console.log('✅ Email entered: ckmtestpixel@gmail.com');

    // Ensure terms/special offers checkbox is checked if present
    const checkbox = page.locator('input#resolution-3, input[name="opt_special_offers"]');
    if (await checkbox.count() > 0) {
      const isChecked = await checkbox.isChecked();
      if (!isChecked) {
        await checkbox.check();
        console.log('✅ Checked special offers / TCPA consent checkbox');
      }
    }
    await page.waitForTimeout(800);

    console.log('👉 Clicking Next (Step 4 -> Step 5)...');
    await page.click('.next-btn4');
    await page.waitForTimeout(1000);

    // -------------------------------------------------------------
    // Step 5: Phone Number
    // -------------------------------------------------------------
    console.log('\n🔘 [6/7] Step 5: Entering Phone Number...');
    await page.waitForSelector('input#primary_phone', { state: 'visible', timeout: 8000 });
    // Type slowly to let input masks format properly
    await page.click('input#primary_phone');
    await page.type('input#primary_phone', dummyPhone.replace(/\D/g, ''), { delay: 100 });
    console.log(`✅ Phone entered: ${dummyPhone}`);
    await page.waitForTimeout(800);

    console.log('👉 Clicking Next (Step 5 -> Step 6)...');
    await page.click('.next-btn5');
    await page.waitForTimeout(1000);

    // -------------------------------------------------------------
    // Step 6: Reference & Form Submission
    // -------------------------------------------------------------
    console.log('\n🔘 [7/7] Step 6: Selecting Referral Source & Submitting Form...');
    await page.waitForSelector('select#reference', { state: 'visible', timeout: 8000 });
    await page.selectOption('select#reference', 'Other');
    console.log('✅ Referral selected: Other');
    await page.waitForTimeout(800);

    // Listen for AJAX /process response
    const processResponsePromise = page.waitForResponse(
      response => response.url().includes('/process') && response.request().method() === 'POST',
      { timeout: 30000 }
    ).catch(() => null);

    console.log('🚀 Submitting form via .next-btn6...');
    await page.click('.next-btn6');

    // Wait for submission response
    console.log('⏳ Awaiting server response from https://tra.com/process ...');
    const processResponse = await processResponsePromise;
    if (processResponse) {
      const status = processResponse.status();
      console.log(`📡 Server Response Status: ${status}`);
      try {
        const json = await processResponse.json();
        console.log('📋 Server Response Payload:', JSON.stringify(json, null, 2));
      } catch (e) {
        console.log('📋 Server Response (non-JSON):', await processResponse.text().catch(() => ''));
      }
    } else {
      console.log('⚠️ No direct AJAX /process response intercepted (possible direct page navigation).');
    }

    // Wait for potential redirect to thank-you page
    await page.waitForTimeout(5000);
    const finalUrl = page.url();
    console.log(`\n🏁 Final Destination URL: ${finalUrl}`);

    // Take screenshot of confirmation/final page
    const screenshotDir = path.join(__dirname, 'screenshots');
    if (!fs.existsSync(screenshotDir)) fs.mkdirSync(screenshotDir, { recursive: true });
    const screenshotPath = path.join(screenshotDir, `tra_com_submission_${Date.now()}.png`);
    await page.screenshot({ path: screenshotPath, fullPage: true });
    console.log(`📸 Confirmation screenshot saved to: ${screenshotPath}`);

    console.log('\n====================================================================');
    console.log('🎉 TRA.COM FORM SUBMISSION COMPLETED SUCCESSFULLY!');
    console.log('====================================================================\n');

  } catch (error) {
    console.error('\n❌ Error during tra.com form execution:', error.message);
    const screenshotDir = path.join(__dirname, 'screenshots');
    if (!fs.existsSync(screenshotDir)) fs.mkdirSync(screenshotDir, { recursive: true });
    const errorScreenshot = path.join(screenshotDir, `tra_com_error_${Date.now()}.png`);
    await page.screenshot({ path: errorScreenshot, fullPage: true }).catch(() => {});
    console.log(`📸 Error screenshot saved to: ${errorScreenshot}`);
  } finally {
    if (!isHeadless) {
      console.log('Holding visible browser window open for 5 seconds for visual review...');
      await page.waitForTimeout(5000);
    }
    await browser.close();
    console.log('Browser closed.');
  }
})();
