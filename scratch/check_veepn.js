const { chromium } = require('playwright-extra');
const path = require('path');
const fs = require('fs');

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

  // Wait for the browser to open the welcome tab automatically
  await new Promise(resolve => setTimeout(resolve, 3000));
  
  const pages = context.pages();
  console.log(`Currently open pages: ${pages.length}`);
  pages.forEach((p, idx) => console.log(`Page ${idx}: ${p.url()}`));

  // 1. Handle welcome tab if open
  const welcomePage = pages.find(p => p.url().includes('welcome/index.html'));
  if (welcomePage) {
    console.log('Handling welcome page...');
    // Click "Continue without a plan" button
    const btn = welcomePage.locator('button:has-text("Continue without a plan")');
    if (await btn.isVisible().catch(() => false)) {
      await btn.click().catch(() => {});
      console.log('Clicked "Continue without a plan" on welcome page');
    }
    await new Promise(resolve => setTimeout(resolve, 2000));
    await welcomePage.close().catch(() => {});
  }

  // 2. Open popup page to configure connection
  const popupPage = await context.newPage();
  const popupUrl = 'chrome-extension://majdfhpaihoncoakbjgbdhglocklcgno/src/popup/popup.html';
  console.log(`Navigating to popup URL: ${popupUrl}`);
  
  try {
    await popupPage.goto(popupUrl);
    await popupPage.waitForTimeout(3000);
    
    // Dynamic Traversal
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
      await popupPage.waitForTimeout(2000);
    }

    if (await popupPage.locator('.premium-banner__skip').isVisible().catch(() => false)) {
      console.log('Clicking "No, thanks, continue limited" (Premium Banner)...');
      await popupPage.click('.premium-banner__skip').catch(() => {});
      await popupPage.waitForTimeout(1000);
    }

    console.log('Clicking Connect Button (forcing)...');
    await popupPage.click('.connect-button', { force: true });
    console.log('Waiting 8 seconds for VPN connection to establish...');
    await popupPage.waitForTimeout(8000);

    const bodyHTML = await popupPage.content();
    const statusText = await popupPage.evaluate(() => document.body.innerText);
    console.log('--- Page text after connection attempt ---');
    console.log(statusText.includes('Connection is ON') ? '✅ Connection is ON!' : '❌ Connection is NOT ON.');

    // Save screenshot
    await popupPage.screenshot({ path: path.join(__dirname, '..', 'veepn_connected.png') });
    console.log('Connected state screenshot saved.');

  } catch (err) {
    console.error('Error:', err.message);
  } finally {
    await context.close();
  }
})();
