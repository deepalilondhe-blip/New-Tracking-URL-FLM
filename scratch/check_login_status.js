const { chromium } = require('playwright');
require('dotenv').config();

(async () => {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  
  const username = process.env.CAKE_USERNAME;
  const password = process.env.CAKE_PASSWORD;
  
  console.log('Using username:', username);
  console.log('Using password length:', password ? password.length : 0);
  
  await page.goto('https://app.forwardleapmarketing.com/', { waitUntil: 'networkidle' });
  
  const uField = page.locator('#u, input[name="u"], input[type="text"]').first();
  const pField = page.locator('#password, input[name="p"], input[type="password"]').first();
  const loginBtn = page.locator('#submitButton, button:has-text("Log In"), input[type="submit"]').first();
  
  await uField.fill(username);
  await pField.fill(password);
  
  await loginBtn.click();
  console.log('Clicked login button, waiting 15 seconds...');
  await page.waitForTimeout(15000);
  
  console.log('URL after wait:', page.url());
  
  // Check if there are any error messages visible on the page
  const pageText = await page.innerText('body');
  console.log('--- PAGE TEXT ---');
  console.log(pageText.substring(0, 1000)); // Print first 1000 characters
  console.log('-----------------');
  
  // Find any elements containing "error", "invalid", "fail", etc.
  const errorElements = await page.evaluate(() => {
    return Array.from(document.querySelectorAll('div, span, p, label'))
      .map(el => el.innerText || '')
      .filter(text => text.toLowerCase().includes('invalid') || text.toLowerCase().includes('error') || text.toLowerCase().includes('incorrect'));
  });
  console.log('Potential error messages found:', errorElements);
  
  await browser.close();
})();
