const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

(async () => {
  console.log('Inspecting row images for D7C7160D...');
  const authStatePath = path.resolve(__dirname, 'cake-auth-state.json');
  console.log('Using auth state:', authStatePath);

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
    console.log('Setting date range: 6/10/2026 -> 6/11/2026...');
    await page.evaluate(() => {
      const isDateLike = (value) => /^\d{1,2}\/\d{1,2}\/\d{4}$/.test((value || '').trim());
      const inputs = Array.from(document.querySelectorAll('input')).filter(el => isDateLike(el.value));
      if (inputs.length >= 2) {
        inputs[0].focus();
        inputs[0].value = '6/10/2026';
        inputs[0].dispatchEvent(new Event('input', { bubbles: true }));
        inputs[0].dispatchEvent(new Event('change', { bubbles: true }));

        inputs[1].focus();
        inputs[1].value = '6/11/2026';
        inputs[1].dispatchEvent(new Event('input', { bubbles: true }));
        inputs[1].dispatchEvent(new Event('change', { bubbles: true }));
      }
    });
    await page.waitForTimeout(1000);

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

    // Find and inspect row for D7C7160D
    const rowHTML = await page.evaluate(() => {
      const trs = Array.from(document.querySelectorAll('tr, .x-grid3-row'));
      const tr = trs.find(r => r.textContent.includes('D7C7160D'));
      if (!tr) return 'Not found';

      const tds = Array.from(tr.querySelectorAll('td')).map((td, idx) => {
        const imgs = Array.from(td.querySelectorAll('img')).map(img => ({
          src: img.src || img.getAttribute('src'),
          className: img.className
        }));
        return {
          index: idx,
          text: td.innerText.trim(),
          html: td.innerHTML,
          imgs
        };
      });

      return {
        rowText: tr.textContent.trim(),
        cells: tds
      };
    });

    console.log('Result:', JSON.stringify(rowHTML, null, 2));

  } catch (err) {
    console.error(err);
  } finally {
    await browser.close();
  }
})();
