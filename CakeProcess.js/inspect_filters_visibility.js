const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

(async () => {
  console.log('Inspecting filter collapse toggles...');
  const authStatePath = path.resolve(__dirname, 'cake-auth-state.json');
  
  const browser = await chromium.launch({ headless: true });
  try {
    const context = await browser.newContext({ storageState: authStatePath });
    const page = await context.newPage();
    
    await page.goto('https://app.forwardleapmarketing.com/newrep.aspx');
    await page.waitForTimeout(2000);
    await page.locator('a[href="newrep.aspx"], a:has-text("REPORTS")').first().click();
    await page.waitForTimeout(2000);
    await page.locator('.secondary-menu-item-text, .secondary-menu-item-container').filter({ hasText: /^Conversions$/i }).first().click();
    await page.waitForTimeout(6000);

    const toggleElements = await page.evaluate(() => {
      // Find all buttons, SVGs, spans, and icons that might be filters toggles
      const elements = Array.from(document.querySelectorAll('button, span, div, svg, i, a'));
      return elements.filter(el => {
        const txt = (el.innerText || '').trim().toLowerCase();
        const className = String(el.className || '').toLowerCase();
        const id = (el.id || '').toLowerCase();
        
        return txt.includes('filter') || 
               className.includes('filter') || 
               className.includes('collapse') || 
               className.includes('chevron') || 
               className.includes('expand') ||
               id.includes('filter') || 
               id.includes('collapse') || 
               id.includes('expand');
      }).map(el => {
        const rect = el.getBoundingClientRect();
        return {
          tag: el.tagName,
          id: el.id || '',
          className: el.className || '',
          innerText: (el.innerText || '').substring(0, 100).replace(/\s+/g, ' '),
          rect: { width: rect.width, height: rect.height, top: rect.top, left: rect.left },
          isVisible: rect.width > 0 && rect.height > 0
        };
      });
    });

    console.log('Potential filter/collapse toggle elements:', JSON.stringify(toggleElements, null, 2));

  } catch (err) {
    console.error(err);
  } finally {
    await browser.close();
  }
})();
