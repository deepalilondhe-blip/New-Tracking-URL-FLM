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
  await page.screenshot({ path: 'login_1_loaded.png' });
  
  const uField = page.locator('#u, input[name="u"], input[type="text"]').first();
  const pField = page.locator('#password, input[name="p"], input[type="password"]').first();
  const loginBtn = page.locator('#submitButton, button:has-text("Log In"), input[type="submit"]').first();
  
  await uField.fill(username);
  await pField.fill(password);
  await page.screenshot({ path: 'login_2_filled.png' });
  
  await loginBtn.click();
  console.log('Clicked login button, waiting 10 seconds...');
  await page.waitForTimeout(10000);
  
  await page.screenshot({ path: 'login_3_after.png' });
  console.log('Current URL:', page.url());
  
  await browser.close();
})();
