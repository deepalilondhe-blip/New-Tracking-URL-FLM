const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

(async () => {
  console.log('Testing direct navigation to Conversions report...');
  const authStatePath = path.resolve(__dirname, 'cake-auth-state.json');
  
  const browser = await chromium.launch({ headless: true });
  try {
    const context = await browser.newContext({ storageState: authStatePath });
    const page = await context.newPage();
    
    console.log('Navigating directly to Conversions...');
    await page.goto('https://app.forwardleapmarketing.com/reports/conversion');
    await page.waitForLoadState('networkidle');
    console.log('Loaded URL:', page.url());

    // Wait for the grid or any elements to appear
    console.log('Waiting for grid header or rows...');
    await page.waitForSelector('.ag-header-cell, table tr, [role="row"]', { timeout: 20000 });
    console.log('✓ Grid loaded.');

    const gridHeaders = await page.evaluate(() => {
      return Array.from(document.querySelectorAll('.ag-header-cell-text, th'))
        .map(el => (el.innerText || '').trim())
        .filter(t => t.length > 0);
    });
    console.log('Grid headers found:', gridHeaders);

    const hasUniqueId = gridHeaders.some(h => h.toLowerCase().includes('unique id'));
    console.log('Is this the Conversions Report? (contains Unique ID):', hasUniqueId);

  } catch (err) {
    console.error('Error during direct navigation test:', err);
  } finally {
    await browser.close();
  }
})();
