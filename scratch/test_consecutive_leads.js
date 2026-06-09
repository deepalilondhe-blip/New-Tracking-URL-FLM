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

  // Listen to console and page errors
  page.on('console', msg => console.log(`[PAGE CONSOLE] [${msg.type()}] ${msg.text()}`));
  page.on('pageerror', err => console.error(`[PAGE ERROR] ${err.message}`));
  
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

    console.log('Navigating to newrep.aspx...');
    await page.goto('https://app.forwardleapmarketing.com/newrep.aspx', { waitUntil: 'networkidle' });
    await page.waitForTimeout(5000);

    const frame = page.frames().find(f => f.name() === 'repFrame' || f.url().includes('reports/conversion')) || page;
    frame.on('console', msg => console.log(`[FRAME CONSOLE] [${msg.type()}] ${msg.text()}`));

    console.log('Waiting for grid to load...');
    await frame.waitForSelector('.x-grid3-row', { timeout: 15000 }).catch(() => {});
    await page.waitForTimeout(2000);

    console.log('Setting date and Non-Tests filter...');
    await frame.evaluate(() => {
      const isDateLike = (value) => /^\d{1,2}\/\d{1,2}\/\d{4}$/.test((value || '').trim());
      const inputs = Array.from(document.querySelectorAll('input')).filter(el => isDateLike(el.value));
      if (inputs.length >= 2) {
        inputs[0].value = '06/05/2026';
        inputs[1].value = '06/08/2026';
        inputs[0].dispatchEvent(new Event('change'));
        inputs[1].dispatchEvent(new Event('change'));
      }

      if (typeof window.Ext !== 'undefined' && window.Ext.ComponentMgr && window.Ext.ComponentMgr.all) {
        const combos = window.Ext.ComponentMgr.all.items.filter(c => c && c.getXType && c.getXType() === 'combo');
        for (const combo of combos) {
          const store = combo.getStore && combo.getStore();
          if (store) {
            let idx = -1;
            store.each((r, index) => {
              const txt = String(r.get(combo.displayField || 'text') || '').trim();
              if (/non-test/i.test(txt) && !/&|and/i.test(txt)) {
                idx = index;
              }
            });
            if (idx !== -1) {
              const record = store.getAt(idx);
              combo.setValue(record.get(combo.valueField || 'value'));
              combo.fireEvent('select', combo, record, idx);
              combo.fireEvent('change', combo, combo.getValue());
            }
          }
        }
      }
    });

    console.log('Clicking filter button...');
    await frame.evaluate(() => {
      const filterTd = Array.from(document.querySelectorAll('td.x-btn-mc')).find(td => td.innerText.includes('Filter'));
      if (filterTd) {
        (filterTd.querySelector('button') || filterTd).click();
      }
    });

    await page.waitForTimeout(6000);

    const rowsSelector = '.x-grid3-row';
    const rows = await frame.locator(rowsSelector).all();
    console.log(`Total rows after filter: ${rows.length}`);

    if (rows.length > 0) {
      // Process Row 0
      console.log('\n--- TRIGGERING LEAD #1 (Row 0) ---');
      const link1 = rows[0].locator('a').first();
      const onclick1 = await link1.getAttribute('onclick');
      console.log(`Action 1: ${onclick1}`);
      await frame.evaluate((str) => {
        const fn = new Function(str);
        fn();
      }, onclick1);

      // Wait for iframe
      console.log('Waiting for card iframe #1...');
      let cardFrame1 = null;
      for (let i = 0; i < 10; i++) {
        cardFrame1 = page.frames().find(f => f.url().includes('card.aspx') && f.url().includes('cardType=lead'));
        if (cardFrame1) break;
        await page.waitForTimeout(1000);
      }
      console.log(`Card iframe #1 detected: ${!!cardFrame1}`);

      if (cardFrame1) {
        // Close card
        console.log('Closing card window via ExtJS on page...');
        await page.evaluate(() => {
          if (typeof window.Ext !== 'undefined' && window.Ext.ComponentMgr) {
            const windows = window.Ext.ComponentMgr.all.items.filter(c => c && c.getXType && c.getXType() === 'window');
            windows.forEach(w => w.close());
          }
        });
        await page.waitForTimeout(3000);
      }

      // Process Row 3
      console.log('\n--- TRIGGERING LEAD #2 (Row 3) ---');
      const link2 = rows[3].locator('a').first();
      const onclick2 = await link2.getAttribute('onclick');
      console.log(`Action 2: ${onclick2}`);
      await frame.evaluate((str) => {
        const fn = new Function(str);
        fn();
      }, onclick2);

      // Wait for iframe
      console.log('Waiting for card iframe #2...');
      let cardFrame2 = null;
      for (let i = 0; i < 10; i++) {
        cardFrame2 = page.frames().find(f => f.url().includes('card.aspx') && f.url().includes('cardType=lead'));
        if (cardFrame2) break;
        await page.waitForTimeout(1000);
      }
      console.log(`Card iframe #2 detected: ${!!cardFrame2}`);
    }

  } catch (err) {
    console.error('Error:', err);
  } finally {
    await browser.close();
  }
})();
