const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

(async () => {
  console.log('Inspecting visible elements in the filter area...');
  const authStatePath = path.resolve(__dirname, 'cake-auth-state.json');
  
  const browser = await chromium.launch({ headless: true });
  try {
    const context = await browser.newContext({ storageState: authStatePath });
    const page = await context.newPage();
    
    await page.goto('https://app.forwardleapmarketing.com/newrep.aspx');
    await page.waitForTimeout(2000);
    await page.locator('a[href="newrep.aspx"], a:has-text("REPORTS")').first().click();
    await page.waitForTimeout(2000);
    await page.locator('.secondary-menu-item-text, .secondary-menu-item-container').filter({ hasText: /^Conversions$/i }).first().click();
    await page.waitForTimeout(6000);

    const elements = await page.evaluate(() => {
      return Array.from(document.querySelectorAll('*'))
        .map(el => {
          const rect = el.getBoundingClientRect();
          return {
            tag: el.tagName,
            id: el.id || '',
            className: el.className || '',
            innerText: (el.innerText || '').substring(0, 100).replace(/\s+/g, ' ').trim(),
            top: rect.top,
            left: rect.left,
            width: rect.width,
            height: rect.height
          };
        })
        .filter(el => el.width > 0 && el.height > 0 && el.top >= 400 && el.top <= 1020);
    });

    console.log('Visible elements in filter coordinate range:', JSON.stringify(elements, null, 2));

  } catch (err) {
    console.error(err);
  } finally {
    await browser.close();
  }
})();
