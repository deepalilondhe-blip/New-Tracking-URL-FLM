const { chromium } = require('playwright');
require('dotenv').config();

(async () => {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  
  console.log('Navigating and logging in...');
  await page.goto('https://app.forwardleapmarketing.com/', { waitUntil: 'networkidle' });
  await page.locator('#u, input[name="u"], input[type="text"]').first().fill(process.env.CAKE_USERNAME);
  await page.locator('#password, input[name="p"], input[type="password"]').first().fill(process.env.CAKE_PASSWORD);
  await page.locator('#submitButton, button:has-text("Log In"), input[type="submit"]').first().click();
  await page.waitForFunction(() => window.location.href.includes('newaff.aspx') || window.location.href.includes('newrep.aspx'));
  await page.waitForTimeout(3000);
  
  await page.locator('a[href="newrep.aspx"], a:has-text("REPORTS")').first().click();
  await page.waitForTimeout(3000);
  await page.locator('.secondary-menu-item-text, .secondary-menu-item-container').filter({ hasText: /^Conversions$/i }).first().click();
  
  await page.waitForFunction(() => {
    const bodyText = document.body ? document.body.innerText : '';
    return bodyText.includes('Conversion Report') && bodyText.includes('Unique ID');
  }, { timeout: 20000 });
  
  console.log('✓ Conversions page loaded.');
  
  const includeTestsToggle = page.locator('.toggle.editor-toggle, label.switch, label').filter({ hasText: 'Include Tests' }).first();
  console.log('Is Include Tests visible before caret click?', await includeTestsToggle.isVisible());
  
  console.log('Clicking Show/Hide Filters caret...');
  const caret = page.locator('.caret-icon, .setup-icon').first();
  if (await caret.isVisible()) {
    await caret.click();
    console.log('Caret clicked.');
    await page.waitForTimeout(2000);
    console.log('Is Include Tests visible after caret click?', await includeTestsToggle.isVisible());
  } else {
    console.log('Caret icon not found/visible');
  }
  
  await browser.close();
})();
