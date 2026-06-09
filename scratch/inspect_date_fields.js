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
  await page.waitForTimeout(2000);
  await page.locator('.secondary-menu-item-text, .secondary-menu-item-container').filter({ hasText: /^Conversions$/i }).first().click();
  
  await page.waitForFunction(() => {
    const bodyText = document.body ? document.body.innerText : '';
    return bodyText.includes('Conversion Report') && bodyText.includes('Unique ID');
  }, { timeout: 20000 });
  
  console.log('--- Inputs BEFORE clicking date button ---');
  const inputsBefore = await page.evaluate(() => {
    return Array.from(document.querySelectorAll('input')).map(el => ({
      id: el.id,
      className: el.className,
      value: el.value,
      placeholder: el.placeholder,
      visible: el.offsetWidth > 0 && el.offsetHeight > 0,
      outerHTML: el.outerHTML
    }));
  });
  console.log(JSON.stringify(inputsBefore, null, 2));
  
  console.log('Clicking date button...');
  await page.click('#date_button');
  await page.waitForTimeout(1000);
  
  console.log('Clicking Custom relative range...');
  await page.click('#date_relative_range_button_custom');
  await page.waitForTimeout(1000);
  
  console.log('--- Inputs AFTER clicking date button and selecting Custom ---');
  const inputsAfter = await page.evaluate(() => {
    return Array.from(document.querySelectorAll('input')).map(el => ({
      id: el.id,
      className: el.className,
      value: el.value,
      placeholder: el.placeholder,
      visible: el.offsetWidth > 0 && el.offsetHeight > 0,
      outerHTML: el.outerHTML
    }));
  });
  console.log(JSON.stringify(inputsAfter, null, 2));
  
  await browser.close();
})();
