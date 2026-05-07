const { chromium } = require('playwright');
const FormPage = require('./pages/FormPage');
const { processLead } = require('./utils/leadProcessor');

console.log('✅ Running TRA-CPL test...');

(async () => {
  const browser = await chromium.launch({ headless: false, slowMo: 800 });
  const page = await browser.newPage();

  try {
    const brand = {
      name: "TRA-CPL",
      url: "https://flmtra.com/?a=659&oc=756&c=2210&s1=",
      sheet: "TRA-CPL",
      sliderAmount: "30,000",
      state: "IN",
      firstName: "ckmtestpixel",
      lastName: "ckmtestpixel",
      email: "ckmtestpixel@gmail.com",
      phone: "9763546781"
    };

    const result = await processLead(brand, page);
    console.log('✅ Test completed:', result);

  } catch (error) {
    console.error('❌ Test failed:', error);
  } finally {
    await page.waitForTimeout(3000);
    await browser.close();
  }
})();