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

  // 1. Wait a moment for welcome page
  await new Promise(resolve => setTimeout(resolve, 3000));
  const pages = context.pages();
  const welcomePage = pages.find(p => p.url().includes('welcome/index.html'));
  if (welcomePage) {
    console.log('Handling welcome page...');
    const btn = welcomePage.locator('button:has-text("Continue without a plan")');
    if (await btn.isVisible().catch(() => false)) {
      await btn.click().catch(() => {});
    }
    await welcomePage.close().catch(() => {});
  }

  // 2. Open popup
  const popupPage = await context.newPage();
  const popupUrl = 'chrome-extension://majdfhpaihoncoakbjgbdhglocklcgno/src/popup/popup.html';
  
  try {
    await popupPage.goto(popupUrl);
    await popupPage.waitForTimeout(3000);

    // Bypass onboarding if visible
    if (await popupPage.locator('.free-step__btn').isVisible().catch(() => false)) {
      await popupPage.click('.free-step__btn').catch(() => {});
      await popupPage.waitForTimeout(500);
    }
    if (await popupPage.locator('.premium-step__btn').isVisible().catch(() => false)) {
      await popupPage.click('.premium-step__btn').catch(() => {});
      await popupPage.waitForTimeout(500);
    }
    if (await popupPage.locator('.pricing-step__action--free').isVisible().catch(() => false)) {
      await popupPage.click('.pricing-step__action--free').catch(() => {});
      await popupPage.waitForTimeout(500);
    }
    if (await popupPage.locator('.trial-modal__close').isVisible().catch(() => false)) {
      await popupPage.click('.trial-modal__close').catch(() => {});
      await popupPage.waitForTimeout(500);
    }
    if (await popupPage.locator('.premium-banner__skip').isVisible().catch(() => false)) {
      await popupPage.click('.premium-banner__skip').catch(() => {});
      await popupPage.waitForTimeout(500);
    }

    // Click regions details button
    console.log('Opening region selection...');
    await popupPage.click('.connect-region__btn');
    await popupPage.waitForTimeout(3000);

    // Dump locations list HTML
    const locationsHTML = await popupPage.content();
    fs.writeFileSync(path.join(__dirname, '..', 'veepn_locations.html'), locationsHTML);
    console.log('Saved locations DOM.');

    // Look for USA in the locations list
    const clickableLocations = await popupPage.evaluate(() => {
      return Array.from(document.querySelectorAll('*'))
        .map(el => ({
          tagName: el.tagName,
          className: el.className,
          text: el.innerText ? el.innerText.substring(0, 50).trim() : ''
        }))
        .filter(el => el.text.includes('United States') || el.text.includes('USA'));
    });
    console.log('USA locations found:', clickableLocations);

  } catch (err) {
    console.error('Error:', err.message);
  } finally {
    await context.close();
  }
})();
