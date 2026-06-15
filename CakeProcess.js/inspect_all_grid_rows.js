const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

(async () => {
  console.log('Inspecting all grid rows for QA Affiliate...');
  const authStatePath = path.resolve(__dirname, 'cake-auth-state.json');

  const browser = await chromium.launch({ headless: true });
  try {
    const context = await browser.newContext({ storageState: authStatePath });
    const page = await context.newPage();
    page.setDefaultTimeout(35000);

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
    await page.waitForTimeout(12000);

    // Get page counts
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
    console.log('Paging info:', footerInfo);

    let allRows = [];
    let pageNum = 1;
    while (pageNum <= footerInfo.totalPages) {
      console.log(`Extracting page ${pageNum} of ${footerInfo.totalPages}...`);
      
      const pageRows = await page.evaluate((currPage) => {
        const normalize = (s) => (s || '').replace(/\s+/g, ' ').trim();
        const trs = Array.from(document.querySelectorAll('.x-grid3-row, table tr'));
        
        return trs.map((tr, index) => {
          const rowText = normalize(tr.textContent || '');
          if (rowText.length === 0 || rowText.includes('Start End') || rowText.includes('Filter') || rowText.includes('Export')) return null;

          const tds = Array.from(tr.querySelectorAll('td'));
          const cells = tds.map((td, cIdx) => {
            const nodes = [td, ...Array.from(td.querySelectorAll('*'))];
            const styles = nodes.map(n => {
              const compStyle = window.getComputedStyle(n);
              return {
                tag: n.tagName,
                text: normalize(n.innerText || n.textContent || ''),
                color: compStyle.color,
                bgColor: compStyle.backgroundColor
              };
            });
            return {
              colIndex: cIdx,
              text: normalize(td.innerText || ''),
              styles
            };
          });

          const leadIds = rowText.match(/\b[A-Z0-9]{6,12}\b/g) || [];

          return {
            page: currPage,
            index,
            rowText,
            leadIds,
            cells
          };
        }).filter(Boolean);
      }, pageNum);

      allRows.push(...pageRows);

      if (pageNum < footerInfo.totalPages) {
        console.log('Clicking Next page...');
        const nextClicked = await page.evaluate(() => {
          const nextBtn = document.querySelector('button.x-tbar-page-next');
          if (nextBtn) {
            nextBtn.click();
            return true;
          }
          return false;
        });
        if (!nextClicked) {
          console.warn('Next button not found!');
          break;
        }
        await page.waitForTimeout(4000);
      }
      pageNum++;
    }

    console.log(`Total rows extracted: ${allRows.length}`);
    fs.writeFileSync(path.join(__dirname, 'grid_rows_dump.json'), JSON.stringify(allRows, null, 2), 'utf8');
    console.log('Dump saved to grid_rows_dump.json');

    // Check for target lead ID D7C7160D
    const target = allRows.find(r => r.rowText.includes('D7C7160D') || r.leadIds.includes('D7C7160D'));
    if (target) {
      console.log('✓ Target lead D7C7160D FOUND!');
      console.log(JSON.stringify(target, null, 2));
    } else {
      console.log('✗ Target lead D7C7160D NOT found in any page.');
    }

  } catch (err) {
    console.error(err);
  } finally {
    await browser.close();
  }
})();
