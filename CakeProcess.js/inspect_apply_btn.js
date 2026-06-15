const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

(async () => {
  console.log('Inspecting Date Picker buttons...');
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

    const dateBtn = page.locator('#date_button, button:has-text("Today"), button:has-text("Date Range")').first();
    await dateBtn.click();
    await page.waitForTimeout(2000);

    const dropdownHtml = await page.evaluate(() => {
      const el = document.querySelector('.ck-react-date-range-picker-calendar-and-dates');
      return el ? el.innerHTML : 'Not found';
    });

    console.log('Dropdown HTML:', dropdownHtml);

  } catch (err) {
    console.error(err);
  } finally {
    await browser.close();
  }
})();
