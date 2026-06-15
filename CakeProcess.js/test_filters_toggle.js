const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

(async () => {
  console.log('Testing filter panel toggling with wait...');
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
    
    console.log('Waiting for draggable-filters-header...');
    await page.waitForSelector('.draggable-filters-header', { timeout: 20000 });
    console.log('✓ draggable-filters-header loaded.');

    const beforeStats = await page.evaluate(() => {
      const panel = document.querySelector('.ReactCollapse--collapse');
      const input = document.querySelector('input[data-ck-name="Search Affiliates"]');
      const header = document.querySelector('.draggable-filters-header');
      return {
        panelVisible: panel ? (panel.offsetHeight > 0) : false,
        inputVisible: input ? (input.offsetHeight > 0) : false,
        headerHTML: header ? header.innerHTML : ''
      };
    });
    console.log('Before clicking Filters header:', beforeStats);

    // Click the Filters header
    console.log('Clicking draggable-filters-header...');
    await page.click('.draggable-filters-header');
    await page.waitForTimeout(3000);

    // Check visibility after click
    const afterStats = await page.evaluate(() => {
      const panel = document.querySelector('.ReactCollapse--collapse');
      const input = document.querySelector('input[data-ck-name="Search Affiliates"]');
      return {
        panelVisible: panel ? (panel.offsetHeight > 0) : false,
        inputVisible: input ? (input.offsetHeight > 0) : false
      };
    });
    console.log('After clicking Filters header:', afterStats);

  } catch (err) {
    console.error('Error during toggle test:', err);
  } finally {
    await browser.close();
  }
})();
