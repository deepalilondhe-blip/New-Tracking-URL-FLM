const { chromium } = require('playwright');
require('dotenv').config();

(async () => {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  
  console.log('Navigating to login...');
  await page.goto('https://app.forwardleapmarketing.com/', { waitUntil: 'networkidle' });
  
  await page.locator('#u, input[name="u"], input[type="text"]').first().fill(process.env.CAKE_USERNAME);
  await page.locator('#password, input[name="p"], input[type="password"]').first().fill(process.env.CAKE_PASSWORD);
  await page.locator('#submitButton, button:has-text("Log In"), input[type="submit"]').first().click();
  
  console.log('Waiting for login...');
  await page.waitForFunction(() => window.location.href.includes('newaff.aspx') || window.location.href.includes('newrep.aspx'));
  await page.waitForTimeout(2000);
  
  console.log('Navigating to reports...');
  await page.locator('a[href="newrep.aspx"], a:has-text("REPORTS")').first().click();
  await page.waitForTimeout(2000);
  
  console.log('Clicking Conversions...');
  const conversionsItem = page.locator('.secondary-menu-item-text, .secondary-menu-item-container').filter({ hasText: /^Conversions$/i }).first();
  await conversionsItem.click();
  
  console.log('Waiting for Conversions report page to load...');
  await page.waitForFunction(() => {
    const bodyText = document.body ? document.body.innerText : '';
    return bodyText.includes('Conversion Report') && bodyText.includes('Unique ID');
  }, { timeout: 20000 });
  console.log('✓ Conversions page loaded.');
  
  // Try to find the "Include Tests" checkbox/toggle
  console.log('Locating Include Tests checkbox...');
  // Let's dump all checkboxes
  const checkboxes = await page.evaluate(() => {
    return Array.from(document.querySelectorAll('input[type="checkbox"]')).map(el => ({
      outerHTML: el.outerHTML,
      checked: el.checked
    }));
  });
  console.log('All checkboxes on page:', JSON.stringify(checkboxes, null, 2));

  // Let's check how the Include Tests label is structured
  const toggleHtml = await page.evaluate(() => {
    const el = Array.from(document.querySelectorAll('*')).find(e => (e.innerText || '').includes('Include Tests'));
    return el ? el.outerHTML : 'Not found';
  });
  console.log('Include Tests element HTML:', toggleHtml);

  // Click the checkbox or switch
  const includeTestsToggle = page.locator('label:has-text("Include Tests"), .toggle:has-text("Include Tests")').locator('input[type="checkbox"]').first();
  if (await includeTestsToggle.isVisible()) {
    console.log('Include Tests checkbox is visible. Checking...');
    const isChecked = await includeTestsToggle.isChecked();
    console.log('Current status:', isChecked);
    if (!isChecked) {
      await includeTestsToggle.click({ force: true });
      await page.waitForTimeout(3000);
      console.log('After click status:', await includeTestsToggle.isChecked());
    }
  } else {
    // Try clicking by text or label
    console.log('Include Tests checkbox not directly targetable. Trying alternative click on the container/label...');
    const label = page.locator('span:has-text("Include Tests"), div:has-text("Include Tests")').first();
    await label.click();
    await page.waitForTimeout(3000);
  }

  // Dump rows of the grid
  console.log('Dumping grid content after filtering...');
  const gridSelector = 'table, [role="grid"], [role="table"]';
  const rows = await page.locator(`${gridSelector} tr, [role="row"]`).all();
  console.log(`Found ${rows.length} rows`);
  
  for (let i = 0; i < Math.min(10, rows.length); i++) {
    const text = await rows[i].innerText();
    console.log(`Row ${i}:`, text.replace(/\n/g, ' | '));
  }
  
  await browser.close();
})();
