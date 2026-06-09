const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });

(async () => {
  const authStatePath = path.resolve(__dirname, '../CakeProcess.js/cake-auth-state.json');
  console.log('Launching browser...');
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    storageState: fs.existsSync(authStatePath) ? authStatePath : undefined
  });
  const page = await context.newPage();
  
  try {
    console.log('Navigating to Conversions...');
    await page.goto('https://app.forwardleapmarketing.com/newrep.aspx', { waitUntil: 'networkidle' });
    await page.waitForTimeout(3000);

    const conversionsItem = page.locator('.secondary-menu-item-text, .secondary-menu-item-container').filter({ hasText: /^Conversions$/i }).first();
    await conversionsItem.click();
    await page.waitForTimeout(5000);

    console.log('Dumping pagination element HTML and properties...');
    const paginationElements = await page.evaluate(() => {
      const results = [];
      // Search for any element that has next-page related classes or text
      const elements = Array.from(document.querySelectorAll('*')).filter(el => {
        const className = el.className || '';
        const id = el.id || '';
        return (typeof className === 'string' && className.includes('page-next')) || 
               (typeof className === 'string' && className.includes('tbar')) ||
               (el.tagName === 'BUTTON' && (el.innerText || '').includes('Next'));
      });

      for (const el of elements) {
        results.push({
          tagName: el.tagName,
          id: el.id,
          className: el.className,
          innerText: el.innerText,
          disabled: el.disabled,
          outerHTML: el.outerHTML.substring(0, 250)
        });
      }
      return results;
    });

    console.log('Pagination Elements found:', JSON.stringify(paginationElements, null, 2));

  } catch (err) {
    console.error(err);
  } finally {
    await browser.close();
  }
})();
