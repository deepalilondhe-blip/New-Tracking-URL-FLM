const { chromium } = require('playwright-extra');
const stealth = require('puppeteer-extra-plugin-stealth')();

process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';
chromium.use(stealth);

// ========== STATIC DATA ==========
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

const URL = 'http://www.1800freshtax.com/ccpa/';

(async () => {
  const userDataDir = './ccpa-browser-profile';

  const browser = await chromium.launchPersistentContext(userDataDir, {
    headless: false,
    args: [
      '--disable-blink-features=AutomationControlled',
      '--no-sandbox',
      '--window-size=1280,900'
    ],
    viewport: { width: 1280, height: 900 },
    ignoreHTTPSErrors: true,
    locale: 'en-US',
    timezoneId: 'America/New_York',
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36'
  });

  const page = browser.pages()[0] || await browser.newPage();

  // ========== STEP 1: Navigate ==========
  console.log('🌐 Opening CCPA form:', URL);
  await page.goto(URL, { waitUntil: 'networkidle', timeout: 30000 });
  await page.waitForTimeout(2000);
  console.log('✅ Page loaded:', await page.title());

  // ========== STEP 2: Select first radio button (California Resident) ==========
  console.log('\n📋 Selecting "California Resident" radio button...');
  const radioButtons = await page.$$('input[type="radio"]');
  if (radioButtons.length > 0) {
    await radioButtons[0].click();
    console.log('✅ First radio button selected (California Resident)');
  }
  await page.waitForTimeout(500);

  // ========== STEP 3: Select ALL checkboxes (multiple request options) ==========
  console.log('\n📋 Selecting all request checkboxes...');
  const checkboxes = await page.$$('input[type="checkbox"]');
  for (let i = 0; i < checkboxes.length; i++) {
    const isRecaptcha = await checkboxes[i].getAttribute('id');
    // Skip reCAPTCHA checkbox
    if (isRecaptcha && isRecaptcha.includes('recaptcha')) continue;
    
    // Check if it's inside a reCAPTCHA iframe - skip those
    const parentTag = await checkboxes[i].evaluate(el => {
      return el.closest('iframe') ? 'iframe' : 'page';
    });
    if (parentTag === 'iframe') continue;

    await checkboxes[i].check();
    console.log(`  ✅ Checkbox ${i + 1} selected`);
  }
  await page.waitForTimeout(500);

  // ========== STEP 4: Fill form fields ==========
  console.log('\n📝 Filling form with static data...');

  // First Name
  const fnField = await page.$('input[name*="first" i], input[placeholder*="First" i], input[id*="first" i]');
  if (fnField) {
    await fnField.fill(FORM_DATA.firstName);
    console.log('  ✅ First Name:', FORM_DATA.firstName);
  }

  // Last Name
  const lnField = await page.$('input[name*="last" i], input[placeholder*="Last" i], input[id*="last" i]');
  if (lnField) {
    await lnField.fill(FORM_DATA.lastName);
    console.log('  ✅ Last Name:', FORM_DATA.lastName);
  }

  // Street Name
  const streetField = await page.$('input[name*="street" i], input[placeholder*="Street" i], input[id*="street" i]');
  if (streetField) {
    await streetField.fill(FORM_DATA.streetName);
    console.log('  ✅ Street:', FORM_DATA.streetName);
  }

  // Apartment
  const aptField = await page.$('input[name*="apartment" i], input[name*="apt" i], input[placeholder*="Apartment" i], input[id*="apartment" i]');
  if (aptField) {
    await aptField.fill(FORM_DATA.apartment);
    console.log('  ✅ Apartment:', FORM_DATA.apartment);
  }

  // City
  const cityField = await page.$('input[name*="city" i], input[placeholder*="City" i], input[id*="city" i]');
  if (cityField) {
    await cityField.fill(FORM_DATA.city);
    console.log('  ✅ City:', FORM_DATA.city);
  }

  // State (dropdown)
  const stateSelect = await page.$('select[name*="state" i], select[id*="state" i]');
  if (stateSelect) {
    await stateSelect.selectOption({ label: FORM_DATA.state });
    console.log('  ✅ State:', FORM_DATA.state);
  }

  // Zip Code
  const zipField = await page.$('input[name*="zip" i], input[placeholder*="Zip" i], input[id*="zip" i]');
  if (zipField) {
    await zipField.fill(FORM_DATA.zipCode);
    console.log('  ✅ Zip Code:', FORM_DATA.zipCode);
  }

  // Email
  const emailField = await page.$('input[name*="email" i], input[type="email"], input[placeholder*="Email" i], input[id*="email" i]');
  if (emailField) {
    await emailField.fill(FORM_DATA.email);
    console.log('  ✅ Email:', FORM_DATA.email);
  }

  // Phone (masked input — use click + type character by character)
  const phoneField = await page.$('input[name*="phone" i], input[type="tel"], input[placeholder*="Phone" i], input[id*="phone" i]');
  if (phoneField) {
    await phoneField.click();
    await page.waitForTimeout(300);
    // Select all existing content first
    await page.keyboard.press('Home');
    await page.waitForTimeout(200);
    // Type digits only (mask will auto-add dashes)
    const digitsOnly = FORM_DATA.phone.replace(/\D/g, '');
    for (const digit of digitsOnly) {
      await page.keyboard.press(digit);
      await page.waitForTimeout(100);
    }
    console.log('  ✅ Phone:', FORM_DATA.phone);
  }

  await page.waitForTimeout(1000);
  await page.screenshot({ path: 'ccpa_form_filled.png', fullPage: true });
  console.log('\n📸 Screenshot saved: ccpa_form_filled.png');

  // ========== STEP 5: CAPTCHA — Pause for manual solving ==========
  console.log('\n' + '='.repeat(60));
  console.log('⏸️  CAPTCHA PAUSE — Please solve the CAPTCHA manually!');
  console.log('   After solving, the script will auto-detect and continue.');
  console.log('='.repeat(60));

  // Click the reCAPTCHA checkbox first
  const captchaFrame = page.frames().find(f => 
    f.url().includes('recaptcha/api2/anchor') || f.url().includes('recaptcha/enterprise/anchor')
  );
  if (captchaFrame) {
    try {
      const checkbox = await captchaFrame.waitForSelector('#recaptcha-anchor', { timeout: 5000 });
      if (checkbox) {
        await page.waitForTimeout(Math.random() * 1000 + 500);
        await checkbox.click();
        console.log('🖱️ Clicked reCAPTCHA checkbox — solve the image challenge if it appears.');
      }
    } catch(e) {
      console.log('⚠️ Could not auto-click reCAPTCHA checkbox. Please click it manually.');
    }
  }

  // Wait for CAPTCHA to be solved (poll for green checkmark)
  let captchaSolved = false;
  const maxWaitTime = 300000; // 5 minutes max
  const startTime = Date.now();

  while (!captchaSolved && (Date.now() - startTime) < maxWaitTime) {
    await page.waitForTimeout(2000);

    // Check if reCAPTCHA is solved by looking for the checkmark
    if (captchaFrame) {
      try {
        const ariaChecked = await captchaFrame.$eval('#recaptcha-anchor', el => el.getAttribute('aria-checked'));
        if (ariaChecked === 'true') {
          captchaSolved = true;
          console.log('\n🎉 CAPTCHA SOLVED! Continuing...');
        }
      } catch(e) {
        // Frame might have changed, try textarea check
      }
    }

    // Also check for g-recaptcha-response textarea having a value
    if (!captchaSolved) {
      try {
        const responseValue = await page.$eval('textarea[name="g-recaptcha-response"]', el => el.value);
        if (responseValue && responseValue.length > 0) {
          captchaSolved = true;
          console.log('\n🎉 CAPTCHA SOLVED! Continuing...');
        }
      } catch(e) {}
    }

    if (!captchaSolved) {
      const elapsed = Math.round((Date.now() - startTime) / 1000);
      process.stdout.write(`\r⏳ Waiting for CAPTCHA... (${elapsed}s)`);
    }
  }

  if (!captchaSolved) {
    console.log('\n⏰ CAPTCHA timeout (5 minutes). Exiting.');
    await browser.close();
    return;
  }

  // ========== STEP 6: Click Submit ==========
  await page.waitForTimeout(1000);
  console.log('\n🖱️ Clicking Submit button...');

  const submitBtn = await page.$('button:has-text("Submit"), input[type="submit"], button[type="submit"]');
  if (submitBtn) {
    await submitBtn.click();
    console.log('✅ Submit clicked!');
  }

  // Wait for response
  await page.waitForTimeout(5000);
  console.log('📋 URL after submit:', page.url());
  console.log('📋 Title after submit:', await page.title());
  await page.screenshot({ path: 'ccpa_after_submit.png', fullPage: true });
  console.log('📸 Screenshot saved: ccpa_after_submit.png');

  // Get any confirmation text
  try {
    const bodyText = await page.textContent('body');
    console.log('\n📋 Page text (first 500 chars):\n', bodyText.substring(0, 500));
  } catch(e) {}

  console.log('\n✅ DONE! Browser will stay open for 2 minutes.');
  await page.waitForTimeout(120000);
  await browser.close();
})();
