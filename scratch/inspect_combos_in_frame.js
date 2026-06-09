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

    // Get frame
    const frame = page.frame({ name: 'repFrame' });
    if (!frame) {
      console.log('repFrame not found!');
      return;
    }

    console.log('Frame repFrame found. Current URL:', frame.url());

    const comboInfo = await frame.evaluate(() => {
      const info = [];
      if (typeof window.Ext !== 'undefined' && window.Ext.ComponentMgr && window.Ext.ComponentMgr.all) {
        const allItems = window.Ext.ComponentMgr.all.items || [];
        allItems.forEach(c => {
          if (c && c.getXType && c.getXType() === 'combo') {
            const store = c.getStore && c.getStore();
            const storeOptions = [];
            if (store) {
              store.each((r) => {
                // Safely convert values to string
                const txt = String(r.get(c.displayField || 'text') || '').trim();
                const val = String(r.get(c.valueField || 'value') || '').trim();
                storeOptions.push({ text: txt, value: val });
              });
            }
            info.push({
              id: c.getId ? c.getId() : 'unknown',
              value: c.getValue ? c.getValue() : 'unknown',
              rawValue: c.getRawValue ? c.getRawValue() : 'unknown',
              name: c.name || c.hiddenName || 'unknown',
              storeCount: store ? store.getCount() : 0,
              options: storeOptions
            });
          }
        });
      } else {
        return 'ExtJS is not loaded in frame or ComponentMgr is not available';
      }
      return info;
    });

    console.log('Combo boxes found in frame repFrame:');
    console.log(JSON.stringify(comboInfo, null, 2));

  } catch (err) {
    console.error('Error:', err);
  } finally {
    await browser.close();
  }
})();
