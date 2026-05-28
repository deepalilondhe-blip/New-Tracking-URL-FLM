const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

(async () => {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  
  try {
    console.log('Navigating to Cake login page...');
    await page.goto('https://app.forwardleapmarketing.com/?lm_id=sessionexpired');
    await page.waitForLoadState('networkidle');
    
    console.log('Current URL:', page.url());
    
    // Save screenshot
    const screenshotPath = path.join(__dirname, 'cake_login.png');
    await page.screenshot({ path: screenshotPath, fullPage: true });
    console.log('Screenshot saved to:', screenshotPath);
    
    // Extract HTML input elements
    const inputs = await page.evaluate(() => {
      return Array.from(document.querySelectorAll('input, button, select, a')).map(el => ({
        tag: el.tagName,
        type: el.type || '',
        id: el.id || '',
        name: el.name || '',
        placeholder: el.placeholder || '',
        className: el.className || '',
        text: el.innerText || el.value || ''
      }));
    });
    
    console.log('Form elements found:', JSON.stringify(inputs, null, 2));
    
  } catch (error) {
    console.error('Error during inspection:', error.message);
  } finally {
    await browser.close();
  }
})();
