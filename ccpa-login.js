const { chromium } = require('@playwright/test');

process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';

(async () => {
  const browser = await chromium.launch({ headless: false, slowMo: 500 });
  const context = await browser.newContext({ ignoreHTTPSErrors: true });
  const page = await context.newPage();

  const url = 'https://flm-utility.com/ccpa_request/local_storage/read/?authKey=b7hak8w2nKDb2KS2n0d';
  const username = 'admin';
  const password = '@cce$$4F0rw@rdL3@p';

  console.log('🌐 Navigating to CCPA page...');
  await page.goto(url, { waitUntil: 'networkidle', timeout: 30000 });

  console.log('📸 Page loaded. Title:', await page.title());
  console.log('📋 Current URL:', page.url());

  // Take a screenshot to see the page
  await page.screenshot({ path: 'ccpa_page_loaded.png', fullPage: true });
  console.log('📸 Screenshot saved: ccpa_page_loaded.png');

  // Try to find login fields - check for common selectors
  const possibleUserSelectors = [
    'input[name="username"]', 'input[name="user"]', 'input[name="login"]',
    'input[name="email"]', 'input[id="username"]', 'input[id="user"]',
    'input[id="login"]', 'input[type="text"]', 'input[name="id"]',
    'input[placeholder*="user" i]', 'input[placeholder*="id" i]', 'input[placeholder*="login" i]'
  ];

  const possiblePassSelectors = [
    'input[name="password"]', 'input[name="pass"]', 'input[id="password"]',
    'input[id="pass"]', 'input[type="password"]'
  ];

  let userField = null;
  let passField = null;

  for (const sel of possibleUserSelectors) {
    const el = await page.$(sel);
    if (el) {
      userField = sel;
      console.log(`✅ Found username field: ${sel}`);
      break;
    }
  }

  for (const sel of possiblePassSelectors) {
    const el = await page.$(sel);
    if (el) {
      passField = sel;
      console.log(`✅ Found password field: ${sel}`);
      break;
    }
  }

  if (userField && passField) {
    console.log('🔑 Filling login credentials...');
    await page.fill(userField, username);
    await page.fill(passField, password);

    // Take screenshot after filling
    await page.screenshot({ path: 'ccpa_credentials_filled.png', fullPage: true });
    console.log('📸 Screenshot saved: ccpa_credentials_filled.png');

    // Look for submit button
    const submitSelectors = [
      'button[type="submit"]', 'input[type="submit"]',
      'button:has-text("Login")', 'button:has-text("Sign In")',
      'button:has-text("Submit")', 'button:has-text("Log In")',
      'input[value="Login"]', 'input[value="Submit"]'
    ];

    for (const sel of submitSelectors) {
      const btn = await page.$(sel);
      if (btn) {
        console.log(`🖱️ Clicking submit button: ${sel}`);
        await btn.click();
        break;
      }
    }

    // Wait for navigation after login
    await page.waitForTimeout(5000);
    console.log('📋 URL after login:', page.url());
    console.log('📋 Title after login:', await page.title());

    // Take screenshot after login
    await page.screenshot({ path: 'ccpa_after_login.png', fullPage: true });
    console.log('📸 Screenshot saved: ccpa_after_login.png');
  } else {
    console.log('⚠️ Could not find login fields automatically.');
    console.log('📋 Page content preview:');
    const bodyText = await page.textContent('body');
    console.log(bodyText.substring(0, 1000));
  }

  // Keep browser open for user to see
  console.log('\n✅ Login complete! Browser will stay open for 5 minutes.');
  console.log('Press Ctrl+C to close anytime.');
  await page.waitForTimeout(300000);

  await browser.close();
})();
