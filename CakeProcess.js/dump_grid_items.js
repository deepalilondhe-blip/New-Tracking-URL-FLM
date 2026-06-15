const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

(async () => {
  console.log('Dumping all grid items for QA Affiliate...');
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

    // Dump all rows on page 1
    const rowsInfo = await page.evaluate(() => {
      const normalize = (s) => (s || '').replace(/\s+/g, ' ').trim();
      const redLike = (color) => {
        if (!color) return false;
        const c = color.toLowerCase();
        return c.includes('rgb(255, 0, 0)') || c.includes('rgb(220') || c.includes('red');
      };

      const allRows = Array.from(document.querySelectorAll('.x-grid3-row, table tr'));
      return allRows.map((tr, index) => {
        const rowText = normalize(tr.textContent || '');
        if (rowText.length === 0) return null;

        const tds = Array.from(tr.querySelectorAll('td'));
        let hasRed = false;
        let redElements = [];

        for (const td of tds) {
          const nodes = [td, ...Array.from(td.querySelectorAll('*'))];
          for (const node of nodes) {
            const styles = window.getComputedStyle(node);
            if (redLike(styles.color) || redLike(styles.backgroundColor) || redLike(styles.borderColor)) {
              hasRed = true;
              redElements.push({
                tag: node.tagName,
                text: node.innerText || node.textContent || '',
                color: styles.color,
                bgColor: styles.backgroundColor
              });
            }
          }
        }

        const leadIdMatch = rowText.match(/\b[A-Z0-9]{6,12}\b/g) || [];

        return {
          index,
          rowText,
          leadIds: leadIdMatch,
          hasRed,
          redElements
        };
      }).filter(Boolean);
    });

    console.log(`Extracted rows count: ${rowsInfo.length}`);
    const redRows = rowsInfo.filter(r => r.hasRed);
    console.log(`Red rows count: ${redRows.length}`);
    console.log('Red rows details:', JSON.stringify(redRows, null, 2));

    // Look for D7C7160D
    const targetRow = rowsInfo.find(r => r.rowText.includes('D7C7160D') || r.leadIds.includes('D7C7160D'));
    if (targetRow) {
      console.log('✓ Found D7C7160D row in dumped items:', JSON.stringify(targetRow, null, 2));
    } else {
      console.log('✗ Lead ID D7C7160D was not found in the grid row text list.');
      // Print first 5 row texts to see what they look like
      console.log('First 5 rows:', JSON.stringify(rowsInfo.slice(0, 5), null, 2));
    }

  } catch (err) {
    console.error(err);
  } finally {
    await browser.close();
  }
})();
