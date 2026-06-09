const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '..', '.env') });

(async () => {
  const authStatePath = path.resolve(__dirname, '../CakeProcess.js/cake_non_test_auth_state.json');
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    storageState: fs.existsSync(authStatePath) ? authStatePath : undefined
  });
  const page = await context.newPage();
  
  try {
    console.log('Navigating directly to Conversions report...');
    await page.goto('https://app.forwardleapmarketing.com/reports/conversion', { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(5000);
    
    // Set date range
    await page.evaluate(() => {
      const isDateLike = (value) => /^\d{1,2}\/\d{1,2}\/\d{4}$/.test((value || '').trim());
      const inputs = Array.from(document.querySelectorAll('input')).filter(el => isDateLike(el.value));
      if (inputs.length >= 2) {
        inputs[0].value = '06/05/2026';
        inputs[1].value = '06/08/2026';
        inputs[0].dispatchEvent(new Event('change'));
        inputs[1].dispatchEvent(new Event('change'));
      }
    });
    
    // Apply filter Non-Tests
    await page.evaluate(() => {
      if (typeof window.Ext !== 'undefined' && window.Ext.ComponentMgr && window.Ext.ComponentMgr.all) {
        const combos = window.Ext.ComponentMgr.all.items.filter(c => c && c.getXType && c.getXType() === 'combo');
        for (const combo of combos) {
          const store = combo.getStore && combo.getStore();
          if (store) {
            let idx = -1;
            store.each((r, index) => {
              const txt = (r.get(combo.displayField || 'text') || '').trim();
              if (/non-test/i.test(txt) && !/&|and/i.test(txt)) {
                idx = index;
              }
            });
            if (idx !== -1) {
              const record = store.getAt(idx);
              combo.setValue(record.get(combo.valueField || 'value'));
              combo.fireEvent('select', combo, record, idx);
              combo.fireEvent('change', combo, combo.getValue());
            }
          }
        }
      }
    });
    
    // Click Filter button
    await page.evaluate(() => {
      const filterTd = Array.from(document.querySelectorAll('td.x-btn-mc')).find(td => td.innerText.includes('Filter'));
      if (filterTd) {
        (filterTd.querySelector('button') || filterTd).click();
      }
    });
    
    await page.waitForTimeout(6000);
    
    // Scan row index 37
    console.log('Inspecting row index 37...');
    const rowInfo = await page.evaluate(() => {
      const rows = Array.from(document.querySelectorAll('.x-grid3-row, tr.x-grid3-row, table tr, [role="row"]'));
      if (rows.length <= 37) {
        return `Only found ${rows.length} rows, not enough to inspect row 37.`;
      }
      
      const row = rows[37];
      const cells = Array.from(row.querySelectorAll('td, th')).map((cell, cIdx) => ({
        cIdx,
        text: (cell.textContent || '').trim(),
        html: cell.outerHTML,
        links: Array.from(cell.querySelectorAll('a')).map(a => ({
          text: a.innerText,
          html: a.outerHTML,
          isVisible: a.offsetWidth > 0 && a.offsetHeight > 0
        }))
      }));
      
      return {
        rowOuterHTML: row.outerHTML,
        cells
      };
    });
    
    console.log(JSON.stringify(rowInfo, null, 2));
    
  } catch (err) {
    console.error('Error:', err);
  } finally {
    await browser.close();
  }
})();
