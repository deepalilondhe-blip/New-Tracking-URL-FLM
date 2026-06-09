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
  
  console.log('Waiting for login redirect...');
  await page.waitForFunction(() => window.location.href.includes('newaff.aspx') || window.location.href.includes('newrep.aspx'));
  await page.waitForTimeout(3000);
  
  console.log('Clicking REPORTS link...');
  await page.locator('a[href="newrep.aspx"], a:has-text("REPORTS")').first().click();
  await page.waitForTimeout(3000);
  
  console.log('Checking all elements with text Conversions...');
  const locators = await page.locator('.secondary-menu-item-text, .secondary-menu-item-container, a, div, span').all();
  let found = [];
  for (const loc of locators) {
    try {
      const text = (await loc.textContent()).trim();
      if (text === 'Conversions') {
        const visible = await loc.isVisible();
        const html = await loc.evaluate(el => el.outerHTML);
        found.push({ visible, html });
      }
    } catch(e) {}
  }
  console.log('Conversions locators found:', JSON.stringify(found, null, 2));

  console.log('Clicking Conversions under Traffic...');
  // Let's target the link with text Conversions precisely
  const target = page.locator('.secondary-menu-item-text, .secondary-menu-item-container').filter({ hasText: /^Conversions$/i }).first();
  await target.click();
  console.log('Clicked. Waiting 10 seconds for Conversions report to load...');
  await page.waitForTimeout(10000);
  
  await page.screenshot({ path: 'conversions_page_clicked.png' });
  console.log('Current URL:', page.url());
  const innerText = await page.innerText('body');
  console.log('--- PAGE INNER TEXT ---');
  console.log(innerText.substring(0, 1500));
  console.log('-----------------------');
  
  await browser.close();
})();
