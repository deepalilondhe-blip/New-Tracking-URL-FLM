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
      console.log('Login form found. Logging in...');
      await page.fill('#u, input[name="u"], input[type="text"]', CAKE_CREDENTIALS.username);
      await page.fill('#password, input[name="p"], input[type="password"]', CAKE_CREDENTIALS.password);
      await loginButton.click();
      await page.waitForTimeout(5000);
      await context.storageState({ path: authStatePath });
    }

    console.log('Navigating to newrep.aspx...');
    await page.goto('https://app.forwardleapmarketing.com/newrep.aspx', { waitUntil: 'networkidle' });
    await page.waitForTimeout(5000);

    console.log('All Frames:');
    const frames = page.frames();
    console.log(`Total frames found: ${frames.length}`);
    for (let i = 0; i < frames.length; i++) {
      const frame = frames[i];
      console.log(`Frame #${i}: Name="${frame.name()}", URL="${frame.url()}"`);
      
      const hasExt = await frame.evaluate(() => {
        return typeof window.Ext !== 'undefined' && typeof window.Ext.ComponentMgr !== 'undefined';
      }).catch(() => false);
      
      console.log(`  -> Has ExtJS: ${hasExt}`);
    }

  } catch (err) {
    console.error('Error:', err);
  } finally {
    await browser.close();
  }
})();
