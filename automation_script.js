// automation_script.js
// Playwright automation – headed Firefox (Windows)

const { firefox } = require('playwright');

const TARGET_URL = 'https://mlfftd.com/?a=659&oc=656&c=167&s1=';

const formData = {
  sheetName: 'FTD-X',
  sliderValue: 12000,
  firstName: 'ckmtestpixel',
  lastName: 'ckmtestpixel',
  email: 'ckmtestpixel@gmail.com',
  phone: '720-456-5452',
  state: 'Colorado',
  browser: 'Firefox',
  device: 'Windows',
};

(async () => {
  const browser = await firefox.launch({ headless: false });
  const context = await browser.newContext({
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:130.0) Gecko/20100101 Firefox/130.0',
    viewport: { width: 1280, height: 800 },
  });
  const page = await context.newPage();

  await page.goto(TARGET_URL, { waitUntil: 'networkidle' });

  // Adjust selectors as needed based on actual DOM
  await page.selectOption('select#sheetSelect', { label: formData.sheetName }).catch(() => {});

  const slider = await page.$('input[type=range]#slider');
  if (slider) {
    await slider.evaluate((el, val) => { el.value = val; el.dispatchEvent(new Event('input')); }, formData.sliderValue);
  }

  await page.fill('input[name="firstName"], input#firstName', formData.firstName).catch(() => {});
  await page.fill('input[name="lastName"], input#lastName', formData.lastName).catch(() => {});
  await page.fill('input[name="email"], input#email', formData.email).catch(() => {});
  await page.fill('input[name="phone"], input#phone', formData.phone).catch(() => {});
  await page.selectOption('select[name="state"], select#state', { label: formData.state }).catch(() => {});
  await page.fill('input[name="browser"], input#browser', formData.browser).catch(() => {});
  await page.fill('input[name="device"], input#device', formData.device).catch(() => {});

  const submitBtn = await page.$('button[type=submit], button#submit, input[type=submit]');
  if (submitBtn) {
    await Promise.all([
      page.waitForNavigation({ waitUntil: 'networkidle' }).catch(() => {}),
      submitBtn.click(),
    ]);
    console.log('✅ Form submitted');
  }

  await page.screenshot({ path: 'final_state.png', fullPage: true });
  await browser.close();
})();
