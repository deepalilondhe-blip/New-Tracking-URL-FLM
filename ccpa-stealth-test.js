const { chromium } = require('playwright-extra');
const stealth = require('puppeteer-extra-plugin-stealth')();

process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';

// Add stealth plugin to playwright
chromium.use(stealth);

(async () => {
  // Launch with persistent profile to build trust with Google
  const userDataDir = './ccpa-browser-profile';

  const browser = await chromium.launchPersistentContext(userDataDir, {
    headless: false,
    args: [
      '--disable-blink-features=AutomationControlled',
      '--no-sandbox',
      '--disable-web-security',
      '--disable-features=IsolateOrigins,site-per-process',
      '--window-size=1280,800'
    ],
    viewport: { width: 1280, height: 800 },
    ignoreHTTPSErrors: true,
    locale: 'en-US',
    timezoneId: 'America/New_York',
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36'
  });

  const page = browser.pages()[0] || await browser.newPage();

  // Test 1: Check if automation is hidden
  console.log('🔍 Test 1: Checking stealth status...');
  await page.goto('https://bot.sannysoft.com/', { waitUntil: 'networkidle', timeout: 30000 });
  await page.waitForTimeout(3000);
  await page.screenshot({ path: 'stealth_bot_test.png', fullPage: true });
  console.log('📸 Bot detection test saved: stealth_bot_test.png');

  // Test 2: Open the CCPA form page
  console.log('\n🌐 Test 2: Opening CCPA form page...');
  const testUrl = 'https://1800freshtax.com/ccpa';  // Replace with actual CCPA URL
  
  try {
    await page.goto(testUrl, { waitUntil: 'networkidle', timeout: 30000 });
  } catch(e) {
    console.log('⚠️ Page load timeout, continuing...');
  }

  await page.waitForTimeout(3000);
  console.log('📋 Page title:', await page.title());
  console.log('📋 Current URL:', page.url());
  await page.screenshot({ path: 'ccpa_stealth_page.png', fullPage: true });
  console.log('📸 CCPA page screenshot saved: ccpa_stealth_page.png');

  // Check if reCAPTCHA iframe exists
  const captchaFrame = await page.$('iframe[src*="recaptcha"]');
  if (captchaFrame) {
    console.log('\n🔐 reCAPTCHA detected! Attempting to click checkbox...');
    
    // Get the reCAPTCHA iframe
    const frames = page.frames();
    for (const frame of frames) {
      const url = frame.url();
      if (url.includes('recaptcha/api2/anchor') || url.includes('recaptcha/enterprise/anchor')) {
        console.log('✅ Found reCAPTCHA anchor frame');
        try {
          // Wait for the checkbox to be visible and click it
          const checkbox = await frame.waitForSelector('#recaptcha-anchor', { timeout: 5000 });
          if (checkbox) {
            // Add human-like delay before clicking
            await page.waitForTimeout(Math.random() * 2000 + 1000);
            await checkbox.click();
            console.log('🖱️ Clicked reCAPTCHA checkbox!');
            
            // Wait to see result
            await page.waitForTimeout(5000);
            await page.screenshot({ path: 'ccpa_after_captcha_click.png', fullPage: true });
            console.log('📸 After CAPTCHA click saved: ccpa_after_captcha_click.png');
            
            // Check if image challenge appeared
            const challengeFrame = frames.find(f => f.url().includes('recaptcha/api2/bframe'));
            if (challengeFrame) {
              console.log('\n⚠️ Image challenge appeared — stealth was NOT enough.');
              console.log('💡 You will need to solve it manually or use 2Captcha.');
            } else {
              console.log('\n🎉 SUCCESS! CAPTCHA passed with just checkbox click!');
            }
          }
        } catch(e) {
          console.log('⚠️ Could not click checkbox:', e.message);
        }
        break;
      }
    }
  } else {
    console.log('\n✅ No reCAPTCHA found on this page — Stealth may be working!');
  }

  console.log('\n✅ Test complete! Browser will stay open for 5 minutes.');
  console.log('Press Ctrl+C to close anytime.');
  await page.waitForTimeout(300000);
  await browser.close();
})();
