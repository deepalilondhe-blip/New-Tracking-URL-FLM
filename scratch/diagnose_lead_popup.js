const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '..', '.env') });

const CONFIG = {
  CAKE_LOGIN_URL: 'https://app.forwardleapmarketing.com/newaff.aspx',
  CAKE_CREDENTIALS: {
    username: 'urvish.patel@bytestechnolab.com',
    password: 'Urvish@123#2026-06'
  }
};

async function run() {
  const browser = await chromium.launch({ headless: false });
  const context = await browser.newContext();
  const page = await context.newPage();
  
  console.log('Navigating to login page...');
  await page.goto(CONFIG.CAKE_LOGIN_URL, { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(2000);
  
  const usernameField = await page.$('#u, input[name="u"], input[type="text"]');
  const passwordField = await page.$('#password, input[name="p"], input[type="password"]');
  const loginButton = await page.$('#submitButton, button:has-text("Log In"), input[type="submit"]');
  
  if (usernameField && passwordField && loginButton) {
    console.log('Entering credentials...');
    await usernameField.fill(CONFIG.CAKE_CREDENTIALS.username);
    await passwordField.fill(CONFIG.CAKE_CREDENTIALS.password);
    await page.waitForTimeout(500);
    await loginButton.click();
    console.log('Waiting for login redirect...');
    await page.waitForTimeout(5000);
  }
  
  console.log('Navigating to Conversions report directly...');
  await page.goto('https://app.forwardleapmarketing.com/reports/conversion', { waitUntil: 'domcontentloaded', timeout: 30000 });
  await page.waitForTimeout(5000);
  
  // Find first row details link
  const detailsLink = page.locator('.x-grid3-row a').first();
  if (await detailsLink.isVisible().catch(() => false)) {
    console.log('Clicking details link...');
    await detailsLink.evaluate(el => el.click());
    
    console.log('Waiting 8 seconds for popup...');
    await page.waitForTimeout(8000);
    
    const frames = page.frames();
    console.log(`Detected ${frames.length} frames:`);
    frames.forEach((f, idx) => {
      console.log(`Frame #${idx}: Name="${f.name()}", URL="${f.url()}"`);
    });
    
    // Check if there are any iframes in the DOM
    const iframeSrcs = await page.evaluate(() => {
      return Array.from(document.querySelectorAll('iframe')).map(iframe => ({
        id: iframe.id,
        name: iframe.name,
        src: iframe.src,
        className: iframe.className
      }));
    });
    console.log('iframes in DOM:', iframeSrcs);
  } else {
    console.log('No details link found! URL is:', page.url());
    const bodyText = await page.locator('body').innerText().catch(() => '');
    console.log('Body snippet:', bodyText.substring(0, 500));
  }
  
  await browser.close();
}

run().catch(console.error);
