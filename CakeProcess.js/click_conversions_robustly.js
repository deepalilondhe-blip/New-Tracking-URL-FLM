const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

(async () => {
  console.log('Testing robust conversions menu click...');
  const authStatePath = path.resolve(__dirname, 'cake-auth-state.json');
  
  const browser = await chromium.launch({ headless: true });
  try {
    const context = await browser.newContext({ storageState: authStatePath });
    const page = await context.newPage();
    
    console.log('Navigating to newrep.aspx...');
    await page.goto('https://app.forwardleapmarketing.com/newrep.aspx');
    await page.waitForTimeout(3000);

    // Click REPORTS link
    console.log('Clicking REPORTS link...');
    const reportsLink = page.locator('a[href="newrep.aspx"], a:has-text("REPORTS")').first();
    await reportsLink.click();
    await page.waitForTimeout(3000);

    // Find and click Conversions menu item
    console.log('Locating Conversions menu item...');
    const conversionsLocator = page.locator('div, span, a').filter({ hasText: /^Conversions$/ }).first();
    const isConversionsVisible = await conversionsLocator.isVisible().catch(() => false);
    console.log('Conversions menu item visible:', isConversionsVisible);

    if (isConversionsVisible) {
      console.log('Clicking Conversions menu item...');
      await conversionsLocator.click();
      await page.waitForTimeout(5000);
    } else {
      console.log('Menu items present on page:', await page.evaluate(() => {
        return Array.from(document.querySelectorAll('.secondary-menu-item-text, .secondary-menu-item-container, a'))
          .map(el => (el.innerText || '').trim())
          .filter(t => t.length > 0 && t.length < 50);
      }));
      return;
    }

    console.log('URL after clicking Conversions:', page.url());
    
    // Print all frames
    const frames = page.frames();
    console.log(`Found ${frames.length} frames:`);
    frames.forEach((f, idx) => {
      console.log(`Frame ${idx}: Name="${f.name()}", URL="${f.url()}"`);
    });

    // Check if the page has an iframe with name repFrame
    const hasRepFrame = await page.evaluate(() => {
      const iframe = document.querySelector('iframe[name="repFrame"]');
      return iframe ? { src: iframe.src, name: iframe.name } : null;
    });
    console.log('Iframe named repFrame in DOM:', hasRepFrame);

    // Dump page content keywords
    const textContent = await page.evaluate(() => document.body.innerText);
    console.log('Does page contain "Unique ID"?', textContent.includes('Unique ID'));
    console.log('Does page contain "Conversion Report"?', textContent.includes('Conversion Report'));

  } catch (err) {
    console.error(err);
  } finally {
    await browser.close();
  }
})();
