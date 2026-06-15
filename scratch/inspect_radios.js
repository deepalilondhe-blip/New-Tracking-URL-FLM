const { chromium } = require('playwright-extra');
const stealth = require('puppeteer-extra-plugin-stealth')();
chromium.use(stealth);

(async () => {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  
  const urls = [
    'https://tra.com/ccpa-request',
    'https://1800freshtax.com/ccpa/'
  ];
  
  for (const url of urls) {
    console.log(`Navigating to: ${url}`);
    try {
      await page.goto(url, { waitUntil: 'networkidle', timeout: 15000 });
      const radios = await page.evaluate(() => {
        return Array.from(document.querySelectorAll('input[type="radio"]')).map(el => ({
          name: el.name,
          id: el.id,
          value: el.value,
          labelText: el.parentElement ? el.parentElement.textContent.trim() : ''
        }));
      });
      console.log(`URL: ${url}`);
      console.log('Found radio buttons:', JSON.stringify(radios, null, 2));
    } catch (e) {
      console.error(`Error loading ${url}: ${e.message}`);
    }
  }
  
  await browser.close();
})();
