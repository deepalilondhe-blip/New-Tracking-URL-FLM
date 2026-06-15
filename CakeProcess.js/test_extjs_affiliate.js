const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

(async () => {
  console.log('Testing ExtJS QA Affiliate filtering...');
  const authStatePath = path.resolve(__dirname, 'cake-auth-state.json');
  console.log('Using auth state:', authStatePath);

  const browser = await chromium.launch({ headless: true });
  let page;
  try {
    const context = await browser.newContext({ storageState: authStatePath });
    page = await context.newPage();
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

    console.log('Finding Affiliate input element...');
    const affiliateInputLocator = await page.evaluateHandle(() => {
      const inputs = Array.from(document.querySelectorAll('input.x-form-field'));
      // Find the one with All Affiliates
      return inputs.find(i => /All Affiliates/i.test(i.value || ''));
    });

    if (!affiliateInputLocator) {
      console.log('Could not find Affiliate input!');
      await page.screenshot({ path: path.join(__dirname, 'err_no_aff_input.png') });
      return;
    }

    console.log('Found Affiliate input. Clicking and typing "QA Affiliate"...');
    const inputElement = affiliateInputLocator.asElement();
    await inputElement.click();
    await inputElement.fill('');
    await inputElement.type('QA Affiliate', { delay: 100 });
    await page.waitForTimeout(2000);

    // Let's dump all combo list items to see if "QA Affiliate" dropdown is shown
    const listItems = await page.evaluate(() => {
      return Array.from(document.querySelectorAll('.x-combo-list-item'))
        .map(el => ({
          text: el.textContent.trim(),
          visible: el.offsetWidth > 0 && el.offsetHeight > 0,
          class: el.className
        }));
    });
    console.log('Dropdown list items:', JSON.stringify(listItems, null, 2));

    // Let's locate the list item that says "QA Affiliate"
    const clickedItem = await page.evaluate(() => {
      const items = Array.from(document.querySelectorAll('.x-combo-list-item'));
      const target = items.find(el => /QA Affiliate/i.test(el.textContent));
      if (target) {
        target.click();
        return target.textContent.trim();
      }
      return null;
    });

    if (clickedItem) {
      console.log(`✓ Clicked dropdown item: ${clickedItem}`);
    } else {
      console.log('✗ Dropdown item matching "QA Affiliate" not found or not clicked.');
    }

    // Now click the "Filter" button to apply
    console.log('Clicking Filter button...');
    const filterClicked = await page.evaluate(() => {
      const filterTd = Array.from(document.querySelectorAll('td.x-btn-mc')).find(td => td.innerText.includes('Filter'));
      if (filterTd) {
        const btn = filterTd.querySelector('button') || filterTd;
        btn.click();
        return true;
      }
      return false;
    });

    if (filterClicked) {
      console.log('✓ Filter button clicked.');
    } else {
      console.log('✗ Filter button not found via ExtJS selectors.');
      const searchBtn = page.locator('button:has-text("Filter"), button:has-text("Search")').first();
      if (await searchBtn.isVisible()) {
        await searchBtn.click();
        console.log('✓ Clicked search button fallback.');
      }
    }

    await page.waitForTimeout(6000);

    // Let's check the table rows in the grid
    const rowTexts = await page.evaluate(() => {
      return Array.from(document.querySelectorAll('table tr, .x-grid3-row'))
        .map(el => el.innerText.replace(/\s+/g, ' ').trim())
        .filter(t => t.length > 0);
    });

    console.log(`Grid rows count: ${rowTexts.length}`);
    console.log('First 5 rows:', JSON.stringify(rowTexts.slice(0, 5), null, 2));

    await page.screenshot({ path: path.join(__dirname, 'test_extjs_filtered.png'), fullPage: true });
    console.log('Screenshot saved to test_extjs_filtered.png');

  } catch (err) {
    console.error('Error:', err);
    if (page) {
      await page.screenshot({ path: path.join(__dirname, 'test_extjs_err.png') }).catch(() => {});
    }
  } finally {
    await browser.close();
  }
})();
