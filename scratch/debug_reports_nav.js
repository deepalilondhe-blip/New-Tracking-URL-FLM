const { chromium } = require('playwright');
require('dotenv').config();

(async () => {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  
  await page.goto('https://app.forwardleapmarketing.com/', { waitUntil: 'networkidle' });
  
  await page.locator('#u, input[name="u"], input[type="text"]').first().fill(process.env.CAKE_USERNAME);
  await page.locator('#password, input[name="p"], input[type="password"]').first().fill(process.env.CAKE_PASSWORD);
  await page.locator('#submitButton, button:has-text("Log In"), input[type="submit"]').first().click();
  
  await page.waitForFunction(() => window.location.href.includes('newaff.aspx') || window.location.href.includes('newrep.aspx'));
  await page.waitForTimeout(3000);
  await page.screenshot({ path: 'reports_1_dashboard.png' });
  
  console.log('Clicking REPORTS link...');
  await page.locator('a[href="newrep.aspx"], a:has-text("REPORTS")').first().click();
  await page.waitForTimeout(4000);
  await page.screenshot({ path: 'reports_2_after_reports_click.png' });
  
  console.log('Current URL after REPORTS click:', page.url());
  
  // Dump all visible text on the page
  const pageText = await page.innerText('body');
  console.log('--- REPORTS PAGE TEXT ---');
  console.log(pageText.substring(0, 1000));
  
  await browser.close();
})();
