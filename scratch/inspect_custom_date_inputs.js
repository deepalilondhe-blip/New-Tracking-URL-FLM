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
  
  await page.locator('a[href="newrep.aspx"], a:has-text("REPORTS")').first().click();
  await page.waitForTimeout(2000);
  await page.locator('div[title="Conversions"]').first().click();
  await page.waitForTimeout(5000);
  
  // Click date picker
  console.log('Clicking date button...');
  await page.click('#date_button');
  await page.waitForTimeout(1000);
  
  // Click Custom option
  console.log('Clicking Custom relative range option...');
  await page.click('#date_relative_range_button_custom');
  await page.waitForTimeout(2000);
  await page.screenshot({ path: 'custom_dates_rendered.png' });
  
  // Dump all inputs inside the date picker panel
  const inputs = await page.evaluate(() => {
    return Array.from(document.querySelectorAll('.ck-react-date-range-picker input'))
      .map(el => ({
        id: el.id,
        className: el.className,
        value: el.value,
        placeholder: el.placeholder,
        outerHTML: el.outerHTML
      }));
  });
  
  console.log('--- CUSTOM DATE INPUTS ---');
  console.log(JSON.stringify(inputs, null, 2));
  console.log('--------------------------');
  
  await browser.close();
})();
