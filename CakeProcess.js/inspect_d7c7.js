const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

(async () => {
  console.log('Inspecting D7C7160D cell images...');
  const authStatePath = path.resolve(__dirname, 'cake-auth-state.json');

  const browser = await chromium.launch({ headless: true });
  try {
    const context = await browser.newContext({ storageState: authStatePath });
    const page = await context.newPage();
    page.setDefaultTimeout(30000);

    console.log('Navigating to conversions report...');
    await page.goto('https://app.forwardleapmarketing.com/newrep.aspx');
    await page.waitForLoadState('networkidle');

    await page.locator('a[href="newrep.aspx"], a:has-text("REPORTS")').first().click();
    await page.waitForTimeout(2000);
    await page.locator('.secondary-menu-item-text, .secondary-menu-item-container').filter({ hasText: /^Conversions$/i }).first().click();
    await page.waitForTimeout(6000);

    console.log('Setting date range: 6/10/2026 -> 6/11/2026...');
    await page.evaluate(() => {
      const isDateLike = (value) => /^\d{1,2}\/\d{1,2}\/\d{4}$/.test((value || '').trim());
      const inputs = Array.from(document.querySelectorAll('input')).filter(el => isDateLike(el.value));
      if (inputs.length >= 2) {
        inputs[0].value = '6/10/2026';
        inputs[1].value = '6/11/2026';
      }
    });

    console.log('Clicking Filter...');
    await page.evaluate(() => {
      const filterTd = Array.from(document.querySelectorAll('td.x-btn-mc')).find(td => td.innerText.includes('Filter'));
      if (filterTd) {
        const btn = filterTd.querySelector('button') || filterTd;
        btn.click();
      }
    });

    await page.waitForTimeout(10000);

    const result = await page.evaluate(() => {
      const rows = Array.from(document.querySelectorAll('tr, .x-grid3-row'));
      const tr = rows.find(r => r.textContent.includes('D7C7160D'));
      if (!tr) return 'Row not found';

      const tds = Array.from(tr.querySelectorAll('td')).map((td, idx) => {
        const imgs = Array.from(td.querySelectorAll('img')).map(img => ({
          src: img.src || img.getAttribute('src') || '',
          className: img.className || '',
          outerHTML: img.outerHTML
        }));
        return {
          index: idx,
          html: td.innerHTML,
          imgs
        };
      });
      return tds;
    });

    console.log('D7C7160D Row Cells HTML and Images:');
    console.log(JSON.stringify(result, null, 2));

  } catch (err) {
    console.error(err);
  } finally {
    await browser.close();
  }
})();
