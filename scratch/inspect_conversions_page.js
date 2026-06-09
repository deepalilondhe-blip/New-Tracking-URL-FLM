const { chromium } = require('playwright');
require('dotenv').config();

(async () => {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  
  await page.goto('https://app.forwardleapmarketing.com/', { waitUntil: 'networkidle' });
  
  await page.locator('#u, input[name="u"], input[type="text"]').first().fill(process.env.CAKE_USERNAME);
  await page.locator('#password, input[name="p"], input[type="password"]').first().fill(process.env.CAKE_PASSWORD);
  await page.locator('#submitButton, button:has-text("Log In"), input[type="submit"]').first().click();
  
  // Wait redirect
  await page.waitForFunction(() => window.location.href.includes('newaff.aspx') || window.location.href.includes('newrep.aspx'));
  await page.waitForTimeout(3000);
  
  // Navigate to Conversions
  await page.locator('a[href="newrep.aspx"], a:has-text("REPORTS")').first().click();
  await page.waitForTimeout(2000);
  await page.locator('.secondary-menu-item-text, .secondary-menu-item-container').filter({ hasText: /^Conversions$/i }).first().click();
  
  console.log('Waiting Conversions Report components...');
  await page.waitForFunction(() => document.body && document.body.innerText.includes('Conversion Report'));
  await page.waitForTimeout(5000);
  
  console.log('Current URL:', page.url());
  
  const pageData = await page.evaluate(() => {
    const inputs = Array.from(document.querySelectorAll('input')).map(el => ({
      id: el.id || '',
      name: el.name || '',
      type: el.type || '',
      value: el.value || '',
      placeholder: el.placeholder || '',
      outerHTML: el.outerHTML
    }));
    
    const selects = Array.from(document.querySelectorAll('select')).map(el => ({
      id: el.id || '',
      name: el.name || '',
      options: Array.from(el.options).map(o => o.text),
      outerHTML: el.outerHTML
    }));
    
    const buttons = Array.from(document.querySelectorAll('button, input[type="button"], input[type="submit"]')).map(el => ({
      id: el.id || '',
      name: el.name || '',
      text: el.innerText || el.textContent || el.value || '',
      outerHTML: el.outerHTML
    }));
    
    return { inputs, selects, buttons };
  });
  
  console.log('--- SELECTS ---');
  console.log(JSON.stringify(pageData.selects, null, 2));
  console.log('--- INPUTS ---');
  console.log(JSON.stringify(pageData.inputs, null, 2));
  console.log('--- BUTTONS ---');
  console.log(JSON.stringify(pageData.buttons, null, 2));
  console.log('-----------------');
  
  await browser.close();
})();
