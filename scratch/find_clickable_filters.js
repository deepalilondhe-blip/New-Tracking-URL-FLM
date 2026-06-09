const { chromium } = require('playwright');
require('dotenv').config();

(async () => {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  
  console.log('Navigating and logging in...');
  await page.goto('https://app.forwardleapmarketing.com/', { waitUntil: 'networkidle' });
  await page.locator('#u, input[name="u"], input[type="text"]').first().fill(process.env.CAKE_USERNAME);
  await page.locator('#password, input[name="p"], input[type="password"]').first().fill(process.env.CAKE_PASSWORD);
  await page.locator('#submitButton, button:has-text("Log In"), input[type="submit"]').first().click();
  await page.waitForFunction(() => window.location.href.includes('newaff.aspx') || window.location.href.includes('newrep.aspx'));
  await page.waitForTimeout(3000);
  
  await page.locator('a[href="newrep.aspx"], a:has-text("REPORTS")').first().click();
  await page.waitForTimeout(3000);
  await page.locator('.secondary-menu-item-text, .secondary-menu-item-container').filter({ hasText: /^Conversions$/i }).first().click();
  
  await page.waitForFunction(() => {
    const bodyText = document.body ? document.body.innerText : '';
    return bodyText.includes('Conversion Report') && bodyText.includes('Unique ID');
  }, { timeout: 20000 });
  
  console.log('✓ Conversions page loaded.');
  
  // Dump all div/span elements containing "Filters"
  const elements = await page.evaluate(() => {
    const visible = (el) => {
      const s = window.getComputedStyle(el);
      const r = el.getBoundingClientRect();
      return s.display !== 'none' && s.visibility !== 'hidden' && r.width > 0 && r.height > 0;
    };
    return Array.from(document.querySelectorAll('.draggable-filters-header div, .caret-icon, .setup-icon, svg'))
      .map(el => ({
        tagName: el.tagName,
        className: el.className,
        text: el.innerText || el.textContent || '',
        visible: visible(el),
        rect: el.getBoundingClientRect()
      }));
  });
  console.log('--- FILTER ELEMENTS ---');
  console.log(JSON.stringify(elements, null, 2));
  
  // Let's try clicking the "Filters" header directly!
  console.log('Clicking the "Filters" text header...');
  await page.locator('div:has-text("Filters")').first().click().catch(e => console.log('Click failed:', e.message));
  await page.waitForTimeout(2000);
  
  const includeTestsToggle = page.locator('.toggle.editor-toggle, label.switch, label').filter({ hasText: 'Include Tests' }).first();
  console.log('Is Include Tests visible after header click?', await includeTestsToggle.isVisible());
  
  await page.screenshot({ path: 'filters_click_test.png' });
  await browser.close();
})();
