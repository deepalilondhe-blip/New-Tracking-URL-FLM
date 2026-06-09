const { chromium } = require('playwright');
require('dotenv').config();

(async () => {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  
  console.log('Navigating to Cake CRM login...');
  await page.goto('https://app.forwardleapmarketing.com/', { waitUntil: 'networkidle' });
  
  await page.locator('#u, input[name="u"], input[type="text"]').first().fill(process.env.CAKE_USERNAME);
  await page.locator('#password, input[name="p"], input[type="password"]').first().fill(process.env.CAKE_PASSWORD);
  await page.locator('#submitButton, button:has-text("Log In"), input[type="submit"]').first().click();
  
  console.log('Waiting for login...');
  await page.waitForFunction(() => window.location.href.includes('newaff.aspx') || window.location.href.includes('newrep.aspx'));
  await page.waitForTimeout(3000);
  
  console.log('Navigating directly to Conversions report page...');
  const baseUrl = new URL(page.url()).origin;
  await page.goto(`${baseUrl}/reports/conversion`, { waitUntil: 'networkidle' });
  await page.waitForTimeout(5000);
  
  await page.screenshot({ path: 'direct_conversion_page.png' });
  
  const pageText = await page.innerText('body');
  console.log('--- PAGE TEXT ---');
  console.log(pageText.substring(0, 1000));
  console.log('-----------------');
  
  await browser.close();
})();
