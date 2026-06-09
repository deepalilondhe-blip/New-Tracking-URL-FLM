const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });

(async () => {
  const authStatePath = path.resolve(__dirname, '../CakeProcess.js/cake-auth-state.json');
  console.log('Launching browser...');
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    storageState: fs.existsSync(authStatePath) ? authStatePath : undefined
  });
  const page = await context.newPage();
  
  try {
    console.log('Navigating to Reports...');
    await page.goto('https://app.forwardleapmarketing.com/newrep.aspx', { waitUntil: 'networkidle' });
    await page.waitForTimeout(3000);
    
    // Check if on login page
    const loginBtn = await page.$('#submitButton');
    if (loginBtn) {
      console.log('Login required, performing login...');
      await page.fill('#u', process.env.CAKE_USERNAME);
      await page.fill('#password', process.env.CAKE_PASSWORD);
      await loginBtn.click();
      await page.waitForNavigation({ waitUntil: 'networkidle' });
      await context.storageState({ path: authStatePath });
    }

    console.log('Navigating to Conversions...');
    const conversionsItem = page.locator('.secondary-menu-item-text, .secondary-menu-item-container').filter({ hasText: /^Conversions$/i }).first();
    await conversionsItem.click();
    
    console.log('Waiting for Conversions report...');
    await page.waitForFunction(() => document.body && document.body.innerText.includes('Conversion Report'));
    await page.waitForTimeout(5000);

    console.log('Grid check...');
    const gridSelector = 'table, [role="grid"], [role="table"]';
    
    const gridHtml = await page.evaluate((selector) => {
      const grids = Array.from(document.querySelectorAll(selector));
      const visibleGrid = grids.find(el => {
        const s = window.getComputedStyle(el);
        const r = el.getBoundingClientRect();
        return s.display !== 'none' && s.visibility !== 'hidden' && r.width > 0 && r.height > 0;
      });
      
      if (!visibleGrid) return 'Visible grid not found among ' + grids.length + ' grids';
      
      const rows = Array.from(visibleGrid.querySelectorAll('tr, [role="row"]'));
      const sampleRows = rows.slice(0, 5).map((row, idx) => {
        const cells = Array.from(row.querySelectorAll('td, th, [role="gridcell"], [role="columnheader"], [role="cell"]'));
        return {
          rowIdx: idx,
          rowClass: row.className,
          rowCount: cells.length,
          cells: cells.map(c => ({
            tag: c.tagName,
            class: c.className,
            text: (c.textContent || '').trim()
          }))
        };
      });
      return {
        gridTagName: visibleGrid.tagName,
        gridClass: visibleGrid.className,
        rowsLength: rows.length,
        sampleRows
      };
    }, gridSelector);

    console.log('--- GRID INFO ---');
    console.log(JSON.stringify(gridHtml, null, 2));
    console.log('-----------------');

  } catch (err) {
    console.error('Error:', err.message);
  } finally {
    await browser.close();
  }
})();
