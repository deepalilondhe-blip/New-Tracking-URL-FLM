const { chromium } = require('playwright');
require('dotenv').config();

(async () => {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  
  await page.goto('https://app.forwardleapmarketing.com/', { waitUntil: 'networkidle' });
  
  await page.locator('#u, input[name="u"], input[type="text"]').first().fill(process.env.CAKE_USERNAME);
  await page.locator('#password, input[name="p"], input[type="password"]').first().fill(process.env.CAKE_PASSWORD);
  await page.locator('#submitButton, button:has-text("Log In"), input[type="submit"]').first().click();
  
  await page.waitForFunction(() => window.location.href.includes('newaff.aspx') || window.location.href.includes('newrep.aspx'));
  await page.waitForTimeout(3000);
  
  await page.locator('a[href="newrep.aspx"], a:has-text("REPORTS")').first().click();
  await page.waitForTimeout(2000);
  await page.locator('div[title="Conversions"]').first().click();
  await page.waitForTimeout(5000);
  
  // Click date range button
  console.log('Clicking date range button...');
  await page.click('#date_button');
  await page.waitForTimeout(2000);
  await page.screenshot({ path: 'date_picker_opened.png' });
  
  // Dump text of opened date picker
  const pickerText = await page.innerText('body');
  console.log('--- PICKER TEXT ---');
  const index = pickerText.indexOf('Today');
  if (index !== -1) {
    console.log(pickerText.substring(index, index + 1500));
  } else {
    console.log(pickerText.substring(0, 1000));
  }
  
  // Dump all divs/inputs that appeared
  const newElements = await page.evaluate(() => {
    return Array.from(document.querySelectorAll('div, span, input, button'))
      .filter(el => {
        const text = (el.innerText || el.textContent || '').trim();
        return text.includes('Custom') || text.includes('Apply') || el.className.includes('datepicker') || el.className.includes('calendar');
      })
      .map(el => ({
        tagName: el.tagName,
        class: el.className,
        text: (el.innerText || el.textContent || '').trim().substring(0, 100),
        outerHTML: el.outerHTML.substring(0, 200)
      }));
  });
  console.log('--- NEW PEKER ELEMENTS ---');
  console.log(JSON.stringify(newElements, null, 2));
  
  await browser.close();
})();
