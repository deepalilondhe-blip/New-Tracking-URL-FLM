const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

(async () => {
  console.log('Inspecting ExtJS collapse tools...');
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

    const tools = await page.evaluate(() => {
      const elements = Array.from(document.querySelectorAll('.x-tool, [class*="x-tool"], .x-panel-header, [class*="header"]'));
      return elements.map(el => {
        const rect = el.getBoundingClientRect();
        return {
          tag: el.tagName,
          id: el.id || '',
          className: el.className || '',
          innerText: (el.innerText || '').trim(),
          rect: { width: rect.width, height: rect.height, top: rect.top, left: rect.left },
          isVisible: rect.width > 0 && rect.height > 0
        };
      });
    });

    console.log('ExtJS tools/headers found:', JSON.stringify(tools.filter(t => t.isVisible), null, 2));

  } catch (err) {
    console.error(err);
  } finally {
    await browser.close();
  }
})();
