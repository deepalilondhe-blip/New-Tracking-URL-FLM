const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

(async () => {
  console.log('Inspecting row details for D7C7160D...');
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

    // Set affiliate
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
    await page.waitForTimeout(8000);

    // Let's inspect the DOM for D7C7160D
    const rowInspection = await page.evaluate(() => {
      // Find any element containing D7C7160D
      const elements = Array.from(document.querySelectorAll('*'));
      const target = elements.find(el => (el.innerText || '').includes('D7C7160D'));
      if (!target) return { found: false };

      // Find the grid row containing it. Usually it is a table or a div with class x-grid3-row
      const gridRow = target.closest('.x-grid3-row') || target.closest('tr') || target;
      
      const tdsInfo = Array.from(gridRow.querySelectorAll('td')).map((td, index) => {
        const nodes = [td, ...Array.from(td.querySelectorAll('*'))];
        const stylesList = nodes.map(n => {
          const style = window.getComputedStyle(n);
          return {
            tag: n.tagName,
            class: n.className || '',
            color: style.color,
            backgroundColor: style.backgroundColor,
            text: n.innerText || n.textContent || ''
          };
        });

        return {
          colIndex: index,
          html: td.innerHTML,
          text: td.innerText,
          stylesList
        };
      });

      return {
        found: true,
        tag: gridRow.tagName,
        class: gridRow.className,
        innerText: gridRow.innerText,
        tdsInfo
      };
    });

    console.log('Inspection result for lead ID D7C7160D:');
    console.log(JSON.stringify(rowInspection, null, 2));

  } catch (err) {
    console.error(err);
  } finally {
    await browser.close();
  }
})();
