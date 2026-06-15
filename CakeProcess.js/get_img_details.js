const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

(async () => {
  console.log('Extracting Test column image details...');
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

    // Set Date Range
    console.log('Setting date range...');
    await page.evaluate(() => {
      const isDateLike = (value) => /^\d{1,2}\/\d{1,2}\/\d{4}$/.test((value || '').trim());
      const inputs = Array.from(document.querySelectorAll('input')).filter(el => isDateLike(el.value));
      if (inputs.length >= 2) {
        inputs[0].value = '6/10/2026';
        inputs[1].value = '6/11/2026';
      }
    });

    // Set affiliate to QA Affiliate
    console.log('Setting QA Affiliate...');
    await page.evaluate(async () => {
      const inputs = Array.from(document.querySelectorAll('input.x-form-field'));
      const affInput = inputs.find(i => /All Affiliates|QA affiliate/i.test(i.value || ''));
      if (affInput) {
        affInput.value = 'QA Affiliate';
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

    console.log('Waiting for grid...');
    await page.waitForTimeout(10000);

    // Inspect Test cell images
    const cellsInfo = await page.evaluate(() => {
      const trs = Array.from(document.querySelectorAll('.x-grid3-row, table tr'));
      return trs.map(tr => {
        const rowText = tr.textContent || '';
        if (rowText.includes('Start End')) return null;

        // Find D7C7160D or check any row
        const leadIdMatch = rowText.match(/\b[A-Z0-9]{6,12}\b/g) || [];
        if (leadIdMatch.length === 0) return null;

        const tds = Array.from(tr.querySelectorAll('td'));
        // Test column is at index 20
        const testTd = tds[20];
        if (!testTd) return null;

        const img = testTd.querySelector('img');
        return {
          leadId: leadIdMatch[0],
          testCellHtml: testTd.innerHTML,
          hasImg: !!img,
          imgSrc: img ? img.src || img.getAttribute('src') || '' : '',
          imgClass: img ? img.className || '' : '',
          imgStyle: img ? img.getAttribute('style') || '' : ''
        };
      }).filter(Boolean);
    });

    console.log('Inspection of first 15 rows Test column:');
    console.log(JSON.stringify(cellsInfo.slice(0, 15), null, 2));

    // Specifically target D7C7160D
    const targetCell = cellsInfo.find(c => c.leadId.includes('D7C7160D'));
    if (targetCell) {
      console.log('Target row D7C7160D details:', JSON.stringify(targetCell, null, 2));
    } else {
      console.log('D7C7160D not found in the list!');
    }

  } catch (err) {
    console.error(err);
  } finally {
    await browser.close();
  }
})();
