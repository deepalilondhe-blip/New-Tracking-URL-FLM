const { chromium } = require('playwright');
const FormPage = require('./pages/FormPage');
const { processLead } = require('./utils/leadProcessor');

console.log('✅ Running PPC CR test...');

(async () => {
    const browser = await chromium.launch({ headless: false, slowMo: 800 });
    const page = await browser.newPage();

    try {
        const brand = {
            name: "PPC CR",
            url: "https://flmtra.com/?a=659&oc=848&c=2210&s1=",
            sheet: "PPC-CR",
            sliderAmount: "1000",
            state: "South Carolina",
            firstName: "ckmtestpixel",
            lastName: "ckmtestpixel",
            email: "ckmtestpixel@gmail.com",
            phone: "803-726-7050",
            skipSecondApi: true
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