const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

(async () => {
  console.log('Inspecting Search Affiliates component...');
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

    const reportFrame = page.frames().find(f => f.name() === 'repFrame' || f.url().includes('reports/conversion') || f.url().includes('Reports/Conversion'));
    if (!reportFrame) {
      console.error('Report frame not found');
      return;
    }

    const structure = await reportFrame.evaluate(() => {
      const results = [];
      const searchBoxDivs = Array.from(document.querySelectorAll('.search-box, [class*="search-box"], [class*="combobox"]'));
      
      searchBoxDivs.forEach((div, idx) => {
        results.push({
          index: idx,
          className: div.className,
          id: div.id,
          innerText: div.innerText,
          innerHTML: div.innerHTML
        });
      });
      return results;
    });

    console.log('Search box structure:', JSON.stringify(structure, null, 2));

  } catch (err) {
    console.error(err);
  } finally {
    await browser.close();
  }
})();
