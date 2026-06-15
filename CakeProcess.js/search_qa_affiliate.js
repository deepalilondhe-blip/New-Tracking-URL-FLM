const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

(async () => {
  console.log('Starting search for QA Affiliate across all pages...');
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

    // Set Date Range to 6/10/2026 -> 6/11/2026 to match the user's active session range
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

    // Click Filter button to apply dates, leaving "All Affiliates" selected
    console.log('Clicking Filter (with All Affiliates selected)...');
    await page.evaluate(() => {
      const filterTd = Array.from(document.querySelectorAll('td.x-btn-mc')).find(td => td.innerText.includes('Filter'));
      if (filterTd) {
        const btn = filterTd.querySelector('button') || filterTd;
        btn.click();
      }
    });

    console.log('Waiting for grid to load...');
    await page.waitForTimeout(10000);

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

    let pageNum = 1;
    let foundRows = [];

    while (pageNum <= footerInfo.totalPages) {
      console.log(`Scanning page ${pageNum} of ${footerInfo.totalPages}...`);
      await page.waitForTimeout(2000);

      const pageMatches = await page.evaluate((currPage) => {
        const normalize = (s) => (s || '').replace(/\s+/g, ' ').trim();
        const trs = Array.from(document.querySelectorAll('tr, .x-grid3-row'));
        const matches = [];

        // Find columns dynamically
        const headerCells = Array.from(document.querySelectorAll('.x-grid3-hd-inner, .x-grid3-header td, th'));
        const testColIndex = headerCells.findIndex(el => el.textContent.trim().toLowerCase() === 'test');
        const pixelColIndex = headerCells.findIndex(el => el.textContent.trim().toLowerCase() === 'pixel');
        const testIdx = testColIndex !== -1 ? testColIndex : 20;
        const pixelIdx = pixelColIndex !== -1 ? pixelColIndex : 17;

        trs.forEach((tr, index) => {
          const rowText = normalize(tr.textContent || '');
          if (rowText.length === 0 || rowText.includes('Start End') || rowText.includes('Filter') || rowText.includes('Export')) return;

          // Check if row matches "QA Affiliate" (mimicking Ctrl+F)
          if (/qa affiliate/i.test(rowText)) {
            const tds = Array.from(tr.querySelectorAll('td'));
            let testRed = false;
            let pixelRed = false;

            // Check Test column for red/inactive icon
            const testTd = tds[testIdx];
            if (testTd) {
              const img = testTd.querySelector('img');
              if (img) {
                const src = img.src || img.getAttribute('src') || '';
                if (src.toLowerCase().includes('inactive')) {
                  testRed = true;
                }
              }
            }

            // Check Pixel column for red/inactive icon
            const pixelTd = tds[pixelIdx];
            if (pixelTd) {
              const img = pixelTd.querySelector('img');
              if (img) {
                const src = img.src || img.getAttribute('src') || '';
                if (src.toLowerCase().includes('inactive')) {
                  pixelRed = true;
                }
              }
            }

            const leadIdMatch = rowText.match(/\b[A-Z0-9]{6,12}\b/g) || [];

            matches.push({
              page: currPage,
              rowIndex: index,
              leadId: leadIdMatch[0] || 'Unknown',
              rowText,
              testRed,
              pixelRed
            });
          }
        });

        return matches;
      }, pageNum);

      if (pageMatches.length > 0) {
        console.log(`Page ${pageNum} match count: ${pageMatches.length}`);
        foundRows.push(...pageMatches);
      }

      // If we found the target lead ID, we can optionally log it immediately
      const targetInPage = pageMatches.find(m => m.leadId === 'D7C7160D' || m.rowText.includes('D7C7160D'));
      if (targetInPage) {
        console.log(`★ FOUND TARGET LEAD D7C7160D on page ${pageNum}! Details:`, JSON.stringify(targetInPage, null, 2));
      }

      if (pageNum < footerInfo.totalPages) {
        // Click Next page button
        const nextClicked = await page.evaluate(() => {
          const nextBtn = document.querySelector('button.x-tbar-page-next');
          if (nextBtn && !nextBtn.closest('.x-item-disabled') && !nextBtn.closest('.x-btn-disabled')) {
            nextBtn.click();
            return true;
          }
          return false;
        });
        if (!nextClicked) {
          console.warn('Next page button was disabled or not found.');
          break;
        }
        await page.waitForTimeout(4000);
      }
      pageNum++;
    }

    console.log('='.repeat(50));
    console.log(`Search completed. Total matching QA Affiliate rows found: ${foundRows.length}`);
    console.log(JSON.stringify(foundRows, null, 2));
    console.log('='.repeat(50));

  } catch (err) {
    console.error('Error during search:', err);
  } finally {
    await browser.close();
  }
})();
