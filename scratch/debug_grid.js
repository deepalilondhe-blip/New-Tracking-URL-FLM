const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

const AUTH_STATE_PATH = path.join(__dirname, '..', 'CakeProcess.js', 'cake_non_test_auth_state.json');

(async () => {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    storageState: fs.existsSync(AUTH_STATE_PATH) ? AUTH_STATE_PATH : undefined
  });
  const page = await context.newPage();
  
  console.log('Navigating to Conversions report...');
  await page.goto('https://app.forwardleapmarketing.com/newrep.aspx', { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(2000);
  
  // Go direct to conversion reports
  const currentUrl = page.url();
  const baseUrl = new URL(currentUrl).origin;
  await page.goto(`${baseUrl}/reports/conversion`, { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(5000);
  
  // Apply Non-Tests filter
  const selectElements = await page.locator('select').all();
  for (const select of selectElements) {
    const options = await select.locator('option').allTextContents();
    const nonTestIndex = options.findIndex(opt => /non-test/i.test(opt) && !/and non-test/i.test(opt));
    if (nonTestIndex !== -1) {
      const val = await select.locator('option').nth(nonTestIndex).getAttribute('value') || options[nonTestIndex];
      await select.selectOption(val);
      console.log(`Applied filter: ${options[nonTestIndex]}`);
      break;
    }
  }
  
  // Run search
  const runBtn = page.locator('button:has-text("Run Report"), button:has-text("Search"), input[type="submit"][value*="Search"]').first();
  if (await runBtn.isVisible()) {
    await runBtn.click();
    await page.waitForTimeout(5000);
  }
  
  // Inspect grid elements
  console.log('Inspecting grid...');
  const data = await page.evaluate(() => {
    const rows = Array.from(document.querySelectorAll('tr, [role="row"]'));
    return rows.slice(0, 15).map((row, idx) => {
      const text = row.textContent || '';
      const cells = Array.from(row.querySelectorAll('td, th, [role="gridcell"]')).map(cell => ({
        text: cell.textContent || '',
        html: cell.outerHTML
      }));
      return {
        rowIndex: idx,
        rowTextLength: text.length,
        rowTextPreview: text.substring(0, 150),
        cellsCount: cells.length,
        cells: cells.slice(0, 8)
      };
    });
  });
  
  console.log(JSON.stringify(data, null, 2));
  
  await browser.close();
})();
