const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

(async () => {
  console.log('Inspecting Search Affiliates structure...');
  const authStatePath = path.resolve(__dirname, 'cake-auth-state.json');
  
  const browser = await chromium.launch({ headless: true });
  try {
    const context = await browser.newContext({ storageState: authStatePath });
    const page = await context.newPage();
    
    await page.goto('https://app.forwardleapmarketing.com/newrep.aspx');
    await page.waitForTimeout(2000);
    
    // Click REPORTS link
    await page.locator('a[href="newrep.aspx"], a:has-text("REPORTS")').first().click();
    await page.waitForTimeout(2000);
    
    // Click Conversions
    await page.locator('.secondary-menu-item-text, .secondary-menu-item-container').filter({ hasText: /^Conversions$/i }).first().click();
    await page.waitForTimeout(8000);

    const frames = page.frames();
    console.log(`Found ${frames.length} frames.`);
    
    for (const frame of frames) {
      console.log(`Frame: Name="${frame.name()}", URL="${frame.url()}"`);
      
      const match = await frame.evaluate(() => {
        const elements = Array.from(document.querySelectorAll('*'));
        const findings = [];
        
        elements.forEach(el => {
          const text = (el.innerText || '').trim();
          if (text === 'Search Affiliates' && el.className) {
            findings.push({
              tag: el.tagName,
              className: el.className,
              id: el.id,
              innerHTML: el.innerHTML,
              parentTag: el.parentElement?.tagName,
              parentClassName: el.parentElement?.className
            });
          }
        });
        return findings;
      });
      
      if (match.length > 0) {
        console.log(`Match found in frame URL="${frame.url()}":`, JSON.stringify(match, null, 2));
      }
    }

  } catch (err) {
    console.error(err);
  } finally {
    await browser.close();
  }
})();
