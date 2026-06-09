const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });

(async () => {
  const authStatePath = path.resolve(__dirname, '../CakeProcess.js/cake-auth-state.json');
  console.log('Launching browser in headed mode...');
  const browser = await chromium.launch({ headless: false, channel: 'chrome' });
  const context = await browser.newContext({
    storageState: fs.existsSync(authStatePath) ? authStatePath : undefined
  });
  const page = await context.newPage();
  
  try {
    await page.setViewportSize({ width: 1920, height: 1080 });
    console.log('Navigating to Conversions...');
    await page.goto('https://app.forwardleapmarketing.com/newrep.aspx', { waitUntil: 'networkidle' });
    await page.waitForTimeout(3000);

    const conversionsItem = page.locator('.secondary-menu-item-text, .secondary-menu-item-container').filter({ hasText: /^Conversions$/i }).first();
    await conversionsItem.click();
    
    console.log('Waiting for page load...');
    await page.waitForFunction(() => {
      const bodyText = document.body ? document.body.innerText : '';
      return bodyText.includes('Conversion Report') && bodyText.includes('Unique ID');
    }, { timeout: 30000 });
    await page.waitForTimeout(3000);

    // Take screenshot before selection
    await page.screenshot({ path: 'scratch/01_before_selection.png' });

    // Inspect the ExtJS combos and select Tests Only
    const comboInfo = await page.evaluate(() => {
      const results = [];
      if (typeof window.Ext !== 'undefined' && window.Ext.ComponentMgr && window.Ext.ComponentMgr.all) {
        const allItems = window.Ext.ComponentMgr.all.items || [];
        const combos = allItems.filter(c => c && c.getXType && c.getXType() === 'combo');
        
        for (const combo of combos) {
          const store = combo.getStore && combo.getStore();
          const items = [];
          if (store && typeof store.each === 'function') {
            store.each(r => {
              items.push({
                value: r.get(combo.valueField || 'value'),
                text: r.get(combo.displayField || 'text')
              });
            });
          }
          results.push({
            id: combo.id,
            name: combo.name,
            value: combo.getValue(),
            rawValue: combo.getRawValue(),
            items: items
          });

          // If this is the tests/non-tests combo, set it to Tests Only
          const idx = store && typeof store.find === 'function' ? store.find(combo.displayField || 'text', /Tests?\s*Only/i) : -1;
          if (idx !== -1) {
            const record = store.getAt(idx);
            combo.setValue(record.get(combo.valueField || 'value'));
            if (typeof combo.fireEvent === 'function') {
              combo.fireEvent('select', combo, record, idx);
              combo.fireEvent('change', combo, combo.getValue());
            }
          }
        }
      }
      return results;
    });

    console.log('Comboboxes found:', JSON.stringify(comboInfo, null, 2));

    await page.waitForTimeout(3000);
    // Take screenshot after selection
    await page.screenshot({ path: 'scratch/02_after_selection.png' });

    // Click Filter button
    console.log('Clicking Filter button...');
    await page.evaluate(() => {
      const filterTd = Array.from(document.querySelectorAll('td.x-btn-mc')).find(td => td.innerText.includes('Filter'));
      if (filterTd) {
        const btn = filterTd.querySelector('button') || filterTd;
        btn.click();
      }
    });

    await page.waitForTimeout(5000);
    // Take screenshot after filter clicked
    await page.screenshot({ path: 'scratch/03_after_filter.png' });

    console.log('Done.');

  } catch (err) {
    console.error('Error:', err);
  } finally {
    await browser.close();
  }
})();
