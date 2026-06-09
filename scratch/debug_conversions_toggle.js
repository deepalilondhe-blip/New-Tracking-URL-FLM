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
  
  console.log('Taking screenshot of Conversions page...');
  await page.screenshot({ path: 'conversions_loaded_actual.png' });
  
  console.log('Checking elements containing "Include Tests"...');
  const elements = await page.evaluate(() => {
    const visible = (el) => {
      const s = window.getComputedStyle(el);
      const r = el.getBoundingClientRect();
      return s.display !== 'none' && s.visibility !== 'hidden' && r.width > 0 && r.height > 0;
    };
    
    // Find all elements that contain the text "Include Tests"
    const results = [];
    const walk = document.createTreeWalker(document.body, NodeFilter.SHOW_ELEMENT);
    let n;
    while (n = walk.nextNode()) {
      if (n.innerText && n.innerText.includes('Include Tests') && n.children.length < 5) {
        results.push({
          tagName: n.tagName,
          className: n.className,
          visible: visible(n),
          rect: n.getBoundingClientRect(),
          outerHTML: n.outerHTML.substring(0, 300)
        });
      }
    }
    return results;
  });
  
  console.log('Include Tests elements:', JSON.stringify(elements, null, 2));
  
  await browser.close();
})();
