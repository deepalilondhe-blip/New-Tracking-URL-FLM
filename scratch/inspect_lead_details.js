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
    console.log('Navigating to login page...');
    await page.goto(CAKE_LOGIN_URL, { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(3000);

    const loginButton = await page.$('#submitButton, button:has-text("Log In"), input[type="submit"]');
    if (loginButton) {
      console.log('Logging in...');
      await page.fill('#u, input[name="u"], input[type="text"]', CAKE_CREDENTIALS.username);
      await page.fill('#password, input[name="p"], input[type="password"]', CAKE_CREDENTIALS.password);
      await loginButton.click();
      await page.waitForTimeout(5000);
      await context.storageState({ path: authStatePath });
    }

    console.log('Navigating to conversions report...');
    await page.goto('https://app.forwardleapmarketing.com/newrep.aspx', { waitUntil: 'networkidle' });
    await page.waitForTimeout(5000);

    const frame = page.frames().find(f => f.name() === 'repFrame' || f.url().includes('reports/conversion')) || page;
    console.log(`Using frame: ${frame === page ? 'main' : 'repFrame'}`);

    const rowsSelector = '.x-grid3-row';
    const count = await frame.locator(rowsSelector).count();
    console.log(`Rows count: ${count}`);

    if (count > 0) {
      const row = frame.locator(rowsSelector).first();
      const detailsLink = row.locator('a').first();
      console.log('Clicking details link of first row...');
      await detailsLink.click({ force: true });
      await page.waitForTimeout(5000);

      // Check URL and frames after click
      console.log('URL after click:', page.url());
      
      const frames = page.frames();
      console.log(`Total frames after click: ${frames.length}`);
      for (let i = 0; i < frames.length; i++) {
        console.log(`Frame #${i}: Name="${frames[i].name()}", URL="${frames[i].url()}"`);
      }

      // Save screenshot
      await page.screenshot({ path: path.join(__dirname, 'lead_details.png'), fullPage: true });
      console.log('Screenshot saved to scratch/lead_details.png');

      // Dump inputs and labels
      const debugInfo = await page.evaluate(() => {
        const inputs = Array.from(document.querySelectorAll('input, select, textarea')).map(el => ({
          id: el.id,
          name: el.name,
          value: el.value,
          type: el.type,
          outerHTML: el.outerHTML
        }));
        
        const textElements = Array.from(document.querySelectorAll('td, span, div, label'))
          .filter(el => el.textContent && el.textContent.includes('Lead ID'))
          .map(el => ({
            tag: el.tagName,
            text: el.textContent.trim(),
            outerHTML: el.outerHTML
          }));

        return { inputs, textElements };
      });

      console.log('Debug Info:');
      console.log(JSON.stringify(debugInfo, null, 2));
    }

  } catch (err) {
    console.error('Error:', err);
  } finally {
    await browser.close();
  }
})();
