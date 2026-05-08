const { chromium } = require('playwright');
const FormPage = require('./pages/FormPage');
const { processLead } = require('./utils/leadProcessor');

console.log('✅ Running TRA-D3 test (Updated Data)...');

(async () => {
  const browser = await chromium.launch({ headless: false, slowMo: 800 });
  const page = await browser.newPage();

  try {
    const brand = {
      name: "TRA-D3",
      url: "https://flmtra.com/?a=659&oc=792&c=2386&s1=",
      sheet: "TRA-DT3",
      sliderAmount: "10,000",
      state: "IN",
      firstName: "ckmtestpixel",
      lastName: "ckmtestpixel",
      email: "ckmtestpixel@gmail.com",
      phone: "843-939-2210"
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
