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
    console.log('Navigating to Conversions...');
    await page.goto('https://app.forwardleapmarketing.com/newrep.aspx', { waitUntil: 'networkidle' });
    await page.waitForTimeout(3000);

    const conversionsItem = page.locator('.secondary-menu-item-text, .secondary-menu-item-container').filter({ hasText: /^Conversions$/i }).first();
    await conversionsItem.click();
    await page.waitForTimeout(5000);

    // Set Dates: Start = 05/01/2026, End = 06/08/2026
    console.log('Setting dates and applying Tests Only filter...');
    await page.evaluate(() => {
      const isDateLike = (value) => /^\d{1,2}\/\d{1,2}\/\d{4}$/.test((value || '').trim());
      const inputs = Array.from(document.querySelectorAll('input')).filter(el => isDateLike(el.value));
      if (inputs.length >= 2) {
        inputs[0].value = '05/01/2026';
        inputs[1].value = '06/08/2026';
        inputs[0].dispatchEvent(new Event('change'));
        inputs[1].dispatchEvent(new Event('change'));
      }
      
      const select = Array.from(document.querySelectorAll('select')).find(s => {
        return Array.from(s.options).some(o => /Tests?\s*&\s*Non-Tests?/i.test(o.text));
      });
      if (select) {
        const opt = Array.from(select.options).find(o => /Tests?\s*Only/i.test(o.text));
        if (opt) {
          select.value = opt.value;
        } else {
          select.value = '3';
        }
        select.dispatchEvent(new Event('change'));
      }
    });

    await page.waitForTimeout(1000);
    
    // Click Filter button explicitly via evaluate
    console.log('Clicking the "Filter" button...');
    const clicked = await page.evaluate(() => {
      const filterTd = Array.from(document.querySelectorAll('td.x-btn-mc')).find(td => td.innerText.includes('Filter'));
      if (filterTd) {
        const btn = filterTd.querySelector('button') || filterTd;
        btn.click();
        return true;
      }
      return false;
    });
    console.log(clicked ? '✓ Filter button clicked.' : 'Filter button not found via DOM search');
    
    await page.waitForTimeout(7000); // Wait for load

    console.log('Extracting row texts...');
    const rowsText = await page.evaluate(() => {
      const rows = Array.from(document.querySelectorAll('.x-grid3-row, .ag-row, [role="row"], tr'));
      return rows.map((r, idx) => ({
        idx,
        class: r.className,
        text: (r.textContent || '').trim().replace(/\s+/g, ' ')
      }));
    });

    console.log('--- VISIBLE ROWS ---');
    rowsText.slice(0, 35).forEach(r => console.log(`[Row ${r.idx}] Class: "${r.class}" -> Text: "${r.text}"`));
    console.log('--------------------');

  } catch (err) {
    console.error('Error:', err.message);
  } finally {
    await browser.close();
  }
})();
