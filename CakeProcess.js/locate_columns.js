const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

(async () => {
  console.log('Locating grid columns...');
  const authStatePath = path.resolve(__dirname, 'cake-auth-state.json');

  const browser = await chromium.launch({ headless: true });
  try {
    const context = await browser.newContext({ storageState: authStatePath });
    const page = await context.newPage();
    page.setDefaultTimeout(30000);

    console.log('Navigating to newrep.aspx...');
    await page.goto('https://app.forwardleapmarketing.com/newrep.aspx');
    await page.waitForLoadState('networkidle');

    console.log('Clicking REPORTS link...');
    await page.locator('a[href="newrep.aspx"], a:has-text("REPORTS")').first().click();
    await page.waitForTimeout(2000);

    console.log('Clicking Conversions item...');
    await page.locator('.secondary-menu-item-text, .secondary-menu-item-container').filter({ hasText: /^Conversions$/i }).first().click();
    await page.waitForTimeout(6000);

    // Extract headers
    const headers = await page.evaluate(() => {
      // Look for the grid headers in ExtJS
      const headerCells = Array.from(document.querySelectorAll('.x-grid3-hd-inner, .x-grid3-header td'));
      return headerCells.map((el, index) => {
        return {
          index,
          text: el.innerText.trim(),
          class: el.className
        };
      }).filter(h => h.text.length > 0);
    });

    console.log('Grid Headers:', JSON.stringify(headers, null, 2));

  } catch (err) {
    console.error(err);
  } finally {
    await browser.close();
  }
})();
