const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

(async () => {
  console.log('Testing QA Affiliate filtering with click navigation...');
  const authStatePath = path.resolve(__dirname, 'cake-auth-state.json');
  
  const browser = await chromium.launch({ headless: true });
  let page;
  try {
    const context = await browser.newContext({ storageState: authStatePath });
    page = await context.newPage();
    
    console.log('Navigating to newrep.aspx...');
    await page.goto('https://app.forwardleapmarketing.com/newrep.aspx');
    await page.waitForTimeout(2000);
    
    // Click REPORTS link
    console.log('Clicking REPORTS link...');
    const reportsLink = page.locator('a[href="newrep.aspx"], a:has-text("REPORTS")').first();
    await reportsLink.click();
    await page.waitForTimeout(2000);

    // Click Conversions item
    console.log('Clicking Conversions item...');
    const conversionsItem = page.locator('.secondary-menu-item-text, .secondary-menu-item-container').filter({ hasText: /^Conversions$/i }).first();
    await conversionsItem.click();
    
    // Wait for Search Affiliates input to load
    console.log('Waiting for Search Affiliates input to load...');
    await page.waitForSelector('input[data-ck-name="Search Affiliates"]', { timeout: 20000 });
    console.log('✓ Search Affiliates input loaded.');

    const searchInput = page.locator('input[data-ck-name="Search Affiliates"]').first();
    console.log('Typing "QA Affiliate"...');
    await searchInput.click();
    await searchInput.fill('');
    await searchInput.type('QA Affiliate', { delay: 100 });
    await page.waitForTimeout(3000);

    // Let's dump all visible elements that might be dropdown options
    const dropdownOptions = await page.evaluate(() => {
      return Array.from(document.querySelectorAll('div, span, li, a'))
        .filter(el => {
          const txt = (el.textContent || '').trim().toLowerCase();
          return txt.includes('qa affiliate') && el.offsetWidth > 0 && el.offsetHeight > 0;
        })
        .map(el => ({
          tag: el.tagName,
          className: el.className,
          id: el.id,
          text: el.innerText
        }));
    });
    console.log('Visible dropdown elements matching "QA Affiliate":', JSON.stringify(dropdownOptions, null, 2));

    // If there is a matching option, click it!
    const optionLocator = page.locator('div, li, span').filter({ hasText: /^QA Affiliate/i }).first();
    if (await optionLocator.isVisible().catch(() => false)) {
      console.log('Clicking the option...');
      await optionLocator.click();
      await page.waitForTimeout(3000);
      console.log('Option clicked.');
    } else {
      console.log('No option matched using selector.');
    }

    // Now, let's see if the grid rows contain ONLY QA Affiliate!
    const rowsText = await page.evaluate(() => {
      return Array.from(document.querySelectorAll('.ag-row, table tr, [role="row"]'))
        .map(el => el.innerText.replace(/\s+/g, ' ').trim())
        .filter(txt => txt.length > 0);
    });
    console.log(`Grid rows found (${rowsText.length}):`, JSON.stringify(rowsText.slice(0, 10), null, 2));

    await page.screenshot({ path: path.join(__dirname, 'filtered_report_state.png'), fullPage: true });
    console.log('Screenshot saved to filtered_report_state.png');

  } catch (err) {
    console.error('Error during filtering test:', err);
    if (page) {
      await page.screenshot({ path: path.join(__dirname, 'err_screenshot.png') }).catch(() => {});
    }
  } finally {
    await browser.close();
  }
})();
