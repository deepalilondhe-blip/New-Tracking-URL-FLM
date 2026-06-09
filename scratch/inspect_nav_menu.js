const { chromium } = require('playwright');
require('dotenv').config();

(async () => {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  
  await page.goto('https://app.forwardleapmarketing.com/', { waitUntil: 'networkidle' });
  
  await page.locator('#u, input[name="u"], input[type="text"]').first().fill(process.env.CAKE_USERNAME);
  await page.locator('#password, input[name="p"], input[type="password"]').first().fill(process.env.CAKE_PASSWORD);
  await page.locator('#submitButton, button:has-text("Log In"), input[type="submit"]').first().click();
  
  await page.waitForTimeout(10000);
  console.log('Landing page URL:', page.url());
  
  const links = await page.evaluate(() => {
    return Array.from(document.querySelectorAll('a'))
      .map(el => ({
        text: el.innerText.trim(),
        href: el.getAttribute('href') || '',
        class: el.getAttribute('class') || '',
        outerHTML: el.outerHTML
      }));
  });
  
  console.log('--- ALL LINKS ---');
  console.log(JSON.stringify(links, null, 2));
  console.log('-----------------');
  
  await browser.close();
})();
