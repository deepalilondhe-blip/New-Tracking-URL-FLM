const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '..', '.env') });

const CAKE_LOGIN_URL = 'https://app.forwardleapmarketing.com/newaff.aspx';
const CAKE_CREDENTIALS = {
  username: 'urvish.patel@bytestechnolab.com',
  password: 'Urvish@123#2026-06'
};

(async () => {
  const authStatePath = path.resolve(__dirname, '../CakeProcess.js/cake_non_test_auth_state.json');
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    storageState: fs.existsSync(authStatePath) ? authStatePath : undefined
  });
  const page = await context.newPage();
  
  try {
    console.log('Logging in...');
    await page.goto(CAKE_LOGIN_URL, { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(3000);

    const loginButton = await page.$('#submitButton, button:has-text("Log In"), input[type="submit"]');
    if (loginButton) {
      await page.fill('#u, input[name="u"], input[type="text"]', CAKE_CREDENTIALS.username);
      await page.fill('#password, input[name="p"], input[type="password"]', CAKE_CREDENTIALS.password);
      await loginButton.click();
      await page.waitForTimeout(5000);
    }

    console.log('Navigating to conversions report...');
    await page.goto('https://app.forwardleapmarketing.com/newrep.aspx', { waitUntil: 'networkidle' });
    await page.waitForTimeout(5000);

    const frame = page.frames().find(f => f.name() === 'repFrame' || f.url().includes('reports/conversion')) || page;
    const rowsSelector = '.x-grid3-row';
    const count = await frame.locator(rowsSelector).count();
    console.log(`Rows count: ${count}`);

    if (count > 0) {
      const row = frame.locator(rowsSelector).first();
      const outerHTML = await row.evaluate(el => el.outerHTML);
      console.log('First Row OuterHTML:');
      console.log(outerHTML);

      const linksInfo = await row.evaluate(rowEl => {
        return Array.from(rowEl.querySelectorAll('a')).map((a, idx) => ({
          idx,
          text: a.innerText,
          href: a.getAttribute('href'),
          outerHTML: a.outerHTML
        }));
      });

      console.log('Links in first row:');
      console.log(JSON.stringify(linksInfo, null, 2));
    }

  } catch (err) {
    console.error('Error:', err);
  } finally {
    await browser.close();
  }
})();
