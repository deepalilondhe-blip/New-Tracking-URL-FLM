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
  
  console.log('Clicking Conversions menu item...');
  await page.locator('div[title="Conversions"]').first().click();
  await page.waitForTimeout(6000);
  await page.screenshot({ path: 'conversions_report_page.png' });
  
  const pageData = await page.evaluate(() => {
    const inputs = Array.from(document.querySelectorAll('input')).map(el => ({
      id: el.id || '',
      name: el.name || '',
      type: el.type || '',
      value: el.value || '',
      placeholder: el.placeholder || '',
      class: el.className || '',
      outerHTML: el.outerHTML
    }));
    
    const selects = Array.from(document.querySelectorAll('select')).map(el => ({
      id: el.id || '',
      name: el.name || '',
      class: el.className || '',
      options: Array.from(el.options).map(o => o.text),
      outerHTML: el.outerHTML
    }));
    
    const buttons = Array.from(document.querySelectorAll('button, input[type="button"], input[type="submit"]')).map(el => ({
      id: el.id || '',
      name: el.name || '',
      class: el.className || '',
      text: el.innerText || el.textContent || el.value || '',
      outerHTML: el.outerHTML
    }));
    
    // Check if there are nested elements that look like buttons but are divs/spans
    const divs = Array.from(document.querySelectorAll('div, span'))
      .filter(el => {
        const text = (el.innerText || el.textContent || '').trim();
        return text === 'Run' || text === 'Run Report' || text === 'Search' || text.includes('Filter');
      })
      .map(el => ({
        tagName: el.tagName,
        class: el.className,
        text: (el.innerText || el.textContent || '').trim(),
        outerHTML: el.outerHTML
      }));
      
    return { inputs, selects, buttons, divs };
  });
  
  console.log('--- SELECTS ---');
  console.log(JSON.stringify(pageData.selects, null, 2));
  console.log('--- INPUTS ---');
  console.log(JSON.stringify(pageData.inputs, null, 2));
  console.log('--- BUTTONS ---');
  console.log(JSON.stringify(pageData.buttons, null, 2));
  console.log('--- DIVS/SPANS ---');
  console.log(JSON.stringify(pageData.divs, null, 2));
  console.log('-----------------');
  
  await browser.close();
})();
