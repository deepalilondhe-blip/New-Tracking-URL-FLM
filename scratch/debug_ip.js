const { chromium } = require('playwright-extra');
const path = require('path');

(async () => {
  const pathToExtension = path.join(__dirname, '..', 'veepn-extension');
  const userDataDir = path.join(__dirname, '..', 'veepn-profile-test');

  console.log('Launching browser...');
  const context = await chromium.launchPersistentContext(userDataDir, {
    headless: false,
    args: [
      `--disable-extensions-except=${pathToExtension}`,
      `--load-extension=${pathToExtension}`
    ]
  });

  // 1. Wait a moment for welcome page
  await new Promise(resolve => setTimeout(resolve, 3000));
  const pages = context.pages();
  const welcomePage = pages.find(p => p.url().includes('welcome/index.html'));
  if (welcomePage) {
    console.log('Handling welcome page...');
    const btn = welcomePage.locator('button:has-text("Continue without a plan")');
    if (await btn.isVisible().catch(() => false)) {
      await btn.click().catch(() => {});
      console.log('Clicked "Continue without a plan" on welcome page.');
    }
    await new Promise(resolve => setTimeout(resolve, 1000));
    await welcomePage.close().catch(() => {});
  }

  // 2. Configure VeePN connection via popup
  const popupPage = await context.newPage();
  const popupUrl = 'chrome-extension://majdfhpaihoncoakbjgbdhglocklcgno/src/popup/popup.html';
  try {
    await popupPage.goto(popupUrl);
    await popupPage.waitForTimeout(3000);

    // Dynamic click-through onboarding
    if (await popupPage.locator('.free-step__btn').isVisible().catch(() => false)) {
      console.log('Clicking "Continue" (Step 1)...');
      await popupPage.click('.free-step__btn').catch(() => {});
      await popupPage.waitForTimeout(1000);
    }
    if (await popupPage.locator('.premium-step__btn').isVisible().catch(() => false)) {
      console.log('Clicking "Start" (Step 2)...');
      await popupPage.click('.premium-step__btn').catch(() => {});
      await popupPage.waitForTimeout(1000);
    }
    if (await popupPage.locator('.pricing-step__action--free').isVisible().catch(() => false)) {
      console.log('Clicking "Continue without a plan" (Step 3)...');
      await popupPage.click('.pricing-step__action--free').catch(() => {});
      await popupPage.waitForTimeout(1000);
    }
    if (await popupPage.locator('.trial-modal__close').isVisible().catch(() => false)) {
      console.log('Clicking "Close" (Step 4 - Trial Modal)...');
      await popupPage.click('.trial-modal__close').catch(() => {});
      await popupPage.waitForTimeout(1000);
    }
    
    // Robust wait for premium banner skip button
    try {
      console.log('Waiting for premium banner skip button...');
      await popupPage.waitForSelector('.premium-banner__skip', { timeout: 4000 });
      await popupPage.click('.premium-banner__skip');
      console.log('Clicked "No, thanks, continue limited"');
    } catch (e) {
      console.log('Premium banner skip button not found within timeout.');
    }

    // Connect
    try {
      console.log('Waiting for connect button...');
      await popupPage.waitForSelector('.connect-button', { timeout: 3000 });
      await popupPage.click('.connect-button', { force: true });
      console.log('Clicked Connect Button (forcing).');
      
      console.log('Waiting 10 seconds for VPN connection to establish...');
      await popupPage.waitForTimeout(10000);
    } catch (e) {
      console.log('Connect button not found.');
    }

    // Save popup status text
    const text = await popupPage.evaluate(() => document.body.innerText);
    console.log(`VPN Popup Text Status: ${text.includes('Connection is ON') ? 'ON' : 'OFF'}`);

  } catch (err) {
    console.error('Error in popup configuration:', err.message);
  } finally {
    await popupPage.close().catch(() => {});
  }

  // 3. Navigate to ipify to check IP and country
  const testPage = await context.newPage();
  try {
    console.log('Navigating to ipinfo.io to check IP geo-location...');
    await testPage.goto('https://ipinfo.io/json', { timeout: 30000 });
    const ipData = await testPage.locator('pre').innerText();
    console.log('IP Details:', ipData);
  } catch (err) {
    console.error('Error checking IP:', err.message);
  } finally {
    await context.close();
  }
})();
