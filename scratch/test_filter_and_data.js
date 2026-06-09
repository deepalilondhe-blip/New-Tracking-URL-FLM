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
  await page.waitForTimeout(3000);
  
  console.log('Navigating to reports...');
  await page.locator('a[href="newrep.aspx"], a:has-text("REPORTS")').first().click();
  await page.waitForTimeout(3000);
  
  console.log('Clicking Conversions...');
  const conversionsItem = page.locator('.secondary-menu-item-text, .secondary-menu-item-container').filter({ hasText: /^Conversions$/i }).first();
  await conversionsItem.click();
  await page.waitForTimeout(5000);
  
  // Try to find the "Include Tests" checkbox
  console.log('Checking "Include Tests" toggle...');
  const checkbox = page.locator('.toggle.editor-toggle, label.switch').filter({ hasText: 'Include Tests' }).locator('input[type="checkbox"]').first();
  if (await checkbox.isVisible()) {
    const isChecked = await checkbox.isChecked();
    console.log('Current Include Tests status:', isChecked);
    if (!isChecked) {
      await checkbox.click({ force: true });
      console.log('Clicked "Include Tests" toggle.');
      await page.waitForTimeout(3000);
    }
  } else {
    console.log('Could not find Include Tests checkbox');
  }

  // Dump rows of the grid
  console.log('Dumping grid content...');
  const gridSelector = 'table, [role="grid"], [role="table"]';
  const rows = await page.locator(`${gridSelector} tr, [role="row"]`).all();
  console.log(`Found ${rows.length} rows`);
  
  for (let i = 0; i < Math.min(10, rows.length); i++) {
    const text = await rows[i].innerText();
    console.log(`Row ${i}:`, text.replace(/\n/g, ' | '));
  }
  
  await page.screenshot({ path: 'conversions_filtered.png' });
  await browser.close();
})();
