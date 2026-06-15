const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

(async () => {
  console.log('Inspecting Date Picker component...');
  const authStatePath = path.resolve(__dirname, 'cake-auth-state.json');
  
  const browser = await chromium.launch({ headless: true });
  try {
    const context = await browser.newContext({ storageState: authStatePath });
    const page = await context.newPage();
    
    await page.goto('https://app.forwardleapmarketing.com/newrep.aspx');
    await page.waitForTimeout(2000);
    
    // Click REPORTS
    await page.locator('a[href="newrep.aspx"], a:has-text("REPORTS")').first().click();
    await page.waitForTimeout(2000);
    
    // Click Conversions
    await page.locator('.secondary-menu-item-text, .secondary-menu-item-container').filter({ hasText: /^Conversions$/i }).first().click();
    await page.waitForTimeout(8000);

    // Click date button/combobox to open date picker dropdown
    console.log('Clicking date button...');
    const dateBtn = page.locator('#date_button, button:has-text("Today"), button:has-text("Date Range")').first();
    if (await dateBtn.isVisible()) {
      await dateBtn.click();
      await page.waitForTimeout(2000);
      console.log('Clicked date button.');
    } else {
      console.log('Date button not found!');
    }

    // Inspect the DOM for inputs and date picker elements
    const pickerInfo = await page.evaluate(() => {
      const inputs = Array.from(document.querySelectorAll('input')).map(el => ({
        tag: el.tagName,
        id: el.id || '',
        name: el.name || '',
        type: el.type || '',
        value: el.value || '',
        className: el.className || '',
        placeholder: el.placeholder || '',
        dataCkName: el.getAttribute('data-ck-name') || ''
      }));

      // Find any calendars, date pickers, or popups
      const popups = Array.from(document.querySelectorAll('div, span, ul, li')).filter(el => {
        const className = el.className || '';
        return className.toLowerCase().includes('calendar') || 
               className.toLowerCase().includes('datepicker') || 
               className.toLowerCase().includes('popup') || 
               className.toLowerCase().includes('dropdown-menu');
      }).map(el => ({
        tag: el.tagName,
        className: el.className,
        innerText: (el.innerText || '').substring(0, 100).replace(/\s+/g, ' ')
      }));

      return { inputs, popups };
    });

    console.log('Inputs after clicking date button:', JSON.stringify(pickerInfo.inputs, null, 2));
    console.log('Date popups/calendars found:', JSON.stringify(pickerInfo.popups, null, 2));

  } catch (err) {
    console.error(err);
  } finally {
    await browser.close();
  }
})();
