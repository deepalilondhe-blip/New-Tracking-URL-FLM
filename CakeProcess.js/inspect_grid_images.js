const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

(async () => {
  console.log('Inspecting grid images...');
  const authStatePath = path.resolve(__dirname, 'cake-auth-state.json');

  const browser = await chromium.launch({ headless: true });
  try {
    const context = await browser.newContext({ storageState: authStatePath });
    const page = await context.newPage();
    page.setDefaultTimeout(30000);

    console.log('Navigating to newrep.aspx...');
    await page.goto('https://app.forwardleapmarketing.com/newrep.aspx');
    await page.waitForLoadState('networkidle');

    console.log('Clicking REPORTS link...');
    await page.locator('a[href="newrep.aspx"], a:has-text("REPORTS")').first().click();
    await page.waitForTimeout(2000);

    console.log('Clicking Conversions item...');
    await page.locator('.secondary-menu-item-text, .secondary-menu-item-container').filter({ hasText: /^Conversions$/i }).first().click();
    await page.waitForTimeout(6000);

    // Set affiliate to QA Affiliate
    console.log('Setting QA Affiliate...');
    await page.evaluate(async () => {
      const inputs = Array.from(document.querySelectorAll('input.x-form-field'));
      const affInput = inputs.find(i => /All Affiliates|QA affiliate/i.test(i.value || ''));
      if (affInput) {
        affInput.focus();
        affInput.value = 'QA Affiliate';
        affInput.dispatchEvent(new Event('input', { bubbles: true }));
        affInput.dispatchEvent(new Event('change', { bubbles: true }));
      }
    });
    await page.waitForTimeout(2000);

    // Select dropdown option
    await page.evaluate(() => {
      const items = Array.from(document.querySelectorAll('.x-combo-list-item'));
      const target = items.find(el => /QA Affiliate/i.test(el.textContent));
      if (target) target.click();
    });
    await page.waitForTimeout(1000);

    // Click Filter button
    console.log('Clicking Filter...');
    await page.evaluate(() => {
      const filterTd = Array.from(document.querySelectorAll('td.x-btn-mc')).find(td => td.innerText.includes('Filter'));
      if (filterTd) {
        const btn = filterTd.querySelector('button') || filterTd;
        btn.click();
      }
    });

    console.log('Waiting for grid to load...');
    await page.waitForTimeout(10000);

    // Inspect image cells for all rows
    const imagesInfo = await page.evaluate(() => {
      const rows = Array.from(document.querySelectorAll('.x-grid3-row'));
      return rows.map((row, rIdx) => {
        const leadIdEl = row.querySelector('.x-grid3-cell-first a, .x-grid3-col-0 a, td a');
        const leadId = leadIdEl ? leadIdEl.textContent.trim() : 'Unknown';
        
        const imgs = Array.from(row.querySelectorAll('img')).map(img => ({
          src: img.src || img.getAttribute('src') || '',
          className: img.className || '',
          style: img.getAttribute('style') || '',
          parentClass: img.parentElement ? img.parentElement.className : '',
          grandParentClass: img.parentElement && img.parentElement.parentElement ? img.parentElement.parentElement.className : ''
        }));

        return {
          rowIndex: rIdx,
          leadId,
          rowTextSummary: row.textContent.substring(0, 100).replace(/\s+/g, ' '),
          imgs
        };
      });
    });

    console.log('Images found in first 10 rows:');
    console.log(JSON.stringify(imagesInfo.slice(0, 10), null, 2));

    // Specifically print details for D7C7160D
    const targetRow = imagesInfo.find(r => r.leadId === 'D7C7160D' || r.rowTextSummary.includes('D7C7160D'));
    if (targetRow) {
      console.log('Target row D7C7160D images:', JSON.stringify(targetRow, null, 2));
    }

  } catch (err) {
    console.error(err);
  } finally {
    await browser.close();
  }
})();
