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
  await page.waitForTimeout(4000);
  
  // Find all elements that contain "Conversions" or "conversions" text
  const elements = await page.evaluate(() => {
    return Array.from(document.querySelectorAll('*'))
      .filter(el => {
        const text = el.innerText || el.textContent || '';
        return text.trim() === 'Conversions' && el.children.length === 0;
      })
      .map(el => ({
        tagName: el.tagName,
        className: el.className,
        outerHTML: el.outerHTML
      }));
  });
  
  console.log('--- CONVERSIONS ELEMENTS ---');
  console.log(JSON.stringify(elements, null, 2));
  console.log('----------------------------');
  
  await browser.close();
})();
