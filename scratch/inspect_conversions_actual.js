const { chromium } = require('playwright');
require('dotenv').config();

(async () => {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  
  console.log('Logging in...');
  await page.goto('https://app.forwardleapmarketing.com/', { waitUntil: 'networkidle' });
  await page.locator('#u, input[name="u"], input[type="text"]').first().fill(process.env.CAKE_USERNAME);
  await page.locator('#password, input[name="p"], input[type="password"]').first().fill(process.env.CAKE_PASSWORD);
  await page.locator('#submitButton, button:has-text("Log In"), input[type="submit"]').first().click();
  await page.waitForFunction(() => window.location.href.includes('newaff.aspx') || window.location.href.includes('newrep.aspx'));
  await page.waitForTimeout(3000);
  
  console.log('Navigating to Reports...');
  await page.locator('a[href="newrep.aspx"], a:has-text("REPORTS")').first().click();
  await page.waitForTimeout(3000);
  
  console.log('Clicking Conversions...');
  await page.locator('.secondary-menu-item-text, .secondary-menu-item-container').filter({ hasText: /^Conversions$/i }).first().click();
  
  console.log('Waiting for Conversions report page...');
  await page.waitForFunction(() => {
    const bodyText = document.body ? document.body.innerText : '';
    return bodyText.includes('Conversion Report') && bodyText.includes('Unique ID');
  }, { timeout: 20000 });
  
  console.log('Conversions page loaded. Dumping select and input elements...');
  
  const elements = await page.evaluate(() => {
    const selects = Array.from(document.querySelectorAll('select')).map(el => ({
      id: el.id,
      name: el.name,
      className: el.className,
      value: el.value,
      options: Array.from(el.options).map(o => ({ value: o.value, text: o.text, selected: o.selected })),
      outerHTML: el.outerHTML
    }));
    
    const inputs = Array.from(document.querySelectorAll('input')).map(el => ({
      id: el.id,
      name: el.name,
      type: el.type,
      value: el.value,
      placeholder: el.placeholder,
      className: el.className,
      outerHTML: el.outerHTML
    }));
    
    return { selects, inputs };
  });
  
  console.log('--- SELECTS ---');
  console.log(JSON.stringify(elements.selects, null, 2));
  console.log('--- INPUTS ---');
  console.log(JSON.stringify(elements.inputs, null, 2));
  console.log('--------------');
  
  await browser.close();
})();
