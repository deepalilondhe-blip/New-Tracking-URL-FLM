const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

(async () => {
  console.log('Searching for lead D7C7160D globally...');
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

    // Set Date Range to 5/1/2026 -> 6/11/2026 (wider range to locate it)
    console.log('Setting wider date range: 5/1/2026 -> 6/11/2026...');
    await page.evaluate(() => {
      const isDateLike = (value) => /^\d{1,2}\/\d{1,2}\/\d{4}$/.test((value || '').trim());
      const inputs = Array.from(document.querySelectorAll('input')).filter(el => isDateLike(el.value));
      if (inputs.length >= 2) {
        inputs[0].focus();
        inputs[0].value = '5/1/2026';
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

    // Get current page and total pages in the footer
    const footerInfo = await page.evaluate(() => {
      const pageInput = document.querySelector('input.x-tbar-page-number');
      const currentPage = pageInput ? parseInt(pageInput.value, 10) : 1;
      let totalPages = 1;
      const toolbar = document.querySelector('.x-panel-bbar, .x-toolbar');
      if (toolbar) {
        const text = toolbar.innerText || '';
        const match = text.match(/of\s+(\d+)/i);
        if (match) totalPages = parseInt(match[1], 10);
      }
      return { currentPage, totalPages };
    });
    console.log('Footer Info:', footerInfo);

    // Search page by page
    let found = false;
    let pageNum = 1;
    while (pageNum <= footerInfo.totalPages) {
      console.log(`Searching page ${pageNum} of ${footerInfo.totalPages}...`);
      
      const matchOnPage = await page.evaluate(() => {
        const target = Array.from(document.querySelectorAll('*')).find(el => (el.innerText || '').includes('D7C7160D'));
        if (!target) return null;

        const gridRow = target.closest('.x-grid3-row') || target.closest('tr') || target;
        const tds = Array.from(gridRow.querySelectorAll('td'));
        
        // Let's get td style details to see colors
        const styleInfo = tds.map(td => {
          const children = [td, ...Array.from(td.querySelectorAll('*'))];
          const colors = children.map(c => {
            const style = window.getComputedStyle(c);
            return {
              tag: c.tagName,
              text: c.innerText || c.textContent || '',
              color: style.color,
              bgColor: style.backgroundColor
            };
          });
          return { text: td.innerText, colors };
        });

        return {
          rowClass: gridRow.className,
          rowText: gridRow.innerText,
          styleInfo
        };
      });

      if (matchOnPage) {
        console.log(`✓ Lead D7C7160D FOUND on page ${pageNum}!`);
        console.log(JSON.stringify(matchOnPage, null, 2));
        found = true;
        break;
      }

      if (pageNum < footerInfo.totalPages) {
        console.log('Navigating to next page...');
        await page.evaluate(() => {
          const nextBtn = document.querySelector('button.x-tbar-page-next');
          if (nextBtn) nextBtn.click();
        });
        await page.waitForTimeout(4000);
      }
      pageNum++;
    }

    if (!found) {
      console.log('✗ Lead D7C7160D was NOT found on any page.');
    }

  } catch (err) {
    console.error(err);
  } finally {
    await browser.close();
  }
})();
