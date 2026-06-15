const { chromium } = require('playwright-extra');
const stealth = require('puppeteer-extra-plugin-stealth')();
chromium.use(stealth);
const path = require('path');

(async () => {
  console.log('🔍 Inspecting AFTR campaign page...');
  const userDataDir = path.join(__dirname, '..', 'ccpa-browser-profile');
  const context = await chromium.launchPersistentContext(userDataDir, {
    headless: true,
    args: ['--disable-blink-features=AutomationControlled', '--no-sandbox']
  });
  const page = await context.newPage();
  try {
    await page.goto('https://mlf-trk.com/?a=659&oc=759&c=2211&s1=', { waitUntil: 'domcontentloaded', timeout: 30000 });
    await page.waitForTimeout(3000);
    const sliderInfo = await page.evaluate(() => {
      const $ = window.jQuery || window.$;
      if ($ && $.fn && $.fn.slider) {
        const $slider = $('#slider, #slider2, .ui-slider').first();
        if ($slider.length > 0) {
          return {
            exists: true,
            min: $slider.slider('option', 'min'),
            max: $slider.slider('option', 'max'),
            value: $slider.slider('option', 'value'),
            step: $slider.slider('option', 'step')
          };
        }
      }
      const taxval = document.querySelector('.taxval, input[name="tax_debt"], input#tax_debt');
      return {
        exists: false,
        taxvalHtml: taxval ? taxval.outerHTML : null
      };
    });
    console.log('Slider Info:', sliderInfo);
  } catch (e) {
    console.error('Error:', e.message);
  } finally {
    await context.close();
  }
})();
