const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

(async () => {
  console.log('Starting Cake Report inspector...');
  const authStatePath = path.resolve(__dirname, 'cake-auth-state.json');
  console.log('Auth state path:', authStatePath);
  
  if (!fs.existsSync(authStatePath)) {
    console.error('Auth state file does not exist at:', authStatePath);
    return;
  }

  const browser = await chromium.launch({ headless: true });
  try {
    const context = await browser.newContext({
      storageState: authStatePath
    });
    const page = await context.newPage();
    page.setDefaultTimeout(30000);

    console.log('Navigating to Cake newrep.aspx...');
    await page.goto('https://app.forwardleapmarketing.com/newrep.aspx');
    await page.waitForLoadState('networkidle');
    console.log('Current URL:', page.url());

    // Click REPORTS link
    console.log('Clicking REPORTS link...');
    const reportsLink = page.locator('a[href="newrep.aspx"], a:has-text("REPORTS")').first();
    await reportsLink.click();
    await page.waitForTimeout(2000);

    // Click Conversions item
    console.log('Clicking Conversions item...');
    const conversionsItem = page.locator('.secondary-menu-item-text, .secondary-menu-item-container').filter({ hasText: /^Conversions$/i }).first();
    await conversionsItem.click();
    await page.waitForTimeout(5000);

    console.log('Current URL after navigation:', page.url());

    // Find conversion/report frame
    const frames = page.frames();
    const reportFrame = frames.find(f => f.name() === 'repFrame' || f.url().includes('reports/conversion') || f.url().includes('Reports/Conversion') || f.url().includes('newrep.aspx'));
    if (!reportFrame) {
      console.error('Could not find report frame!');
      return;
    }

    console.log('Report frame found. Waiting for report content to load...');
    
    // Wait for the page/frame to contain conversion report keywords
    await reportFrame.waitForFunction(() => {
      const body = document.body ? document.body.innerText : '';
      return body.includes('Conversion Report') || body.includes('Start') || body.includes('End');
    }, { timeout: 20000 }).catch(err => {
      console.log('Timeout waiting for Conversion Report keywords:', err.message);
    });

    console.log('Inspecting inputs and layout inside frame...');
    
    const elementsInfo = await reportFrame.evaluate(() => {
      const inputs = Array.from(document.querySelectorAll('input, select, button')).map(el => {
        const parentLabel = el.closest('label')?.innerText || '';
        let adjacentText = '';
        
        if (el.id) {
          const labelFor = document.querySelector(`label[for="${el.id}"]`);
          if (labelFor) adjacentText = labelFor.innerText;
        }
        if (!adjacentText && el.parentElement) {
          adjacentText = el.parentElement.innerText.replace(el.value, '').trim();
        }

        return {
          tag: el.tagName,
          id: el.id || '',
          name: el.name || '',
          type: el.type || '',
          value: el.value || '',
          className: el.className || '',
          placeholder: el.placeholder || '',
          adjacentText: adjacentText.substring(0, 50),
          parentLabel: parentLabel.substring(0, 50)
        };
      });
      
      const visibleTexts = [];
      // Grab any text that mentions "Affiliate"
      const allEls = Array.from(document.querySelectorAll('span, div, label, td'));
      allEls.forEach(el => {
        const txt = el.innerText || '';
        if (txt.toLowerCase().includes('affiliate') && txt.length < 100) {
          visibleTexts.push({
            tag: el.tagName,
            text: txt.trim(),
            className: el.className || '',
            id: el.id || ''
          });
        }
      });

      return { inputs, visibleTexts };
    });

    console.log('Inputs found inside report frame:', JSON.stringify(elementsInfo.inputs, null, 2));
    console.log('Affiliate mentions in DOM:', JSON.stringify(elementsInfo.visibleTexts, null, 2));

    // Capture screenshot to check what the UI looks like
    await page.screenshot({ path: path.join(__dirname, 'reports_conversions_inspect.png'), fullPage: true });
    console.log('Screenshot saved to reports_conversions_inspect.png');

  } catch (err) {
    console.error('Error in inspector:', err);
  } finally {
    await browser.close();
  }
})();
