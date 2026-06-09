const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  await page.goto('https://app.forwardleapmarketing.com/newaff.aspx');
  await page.waitForTimeout(3000);
  
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
  
  console.log(JSON.stringify(inputs, null, 2));
  await browser.close();
})();
