const { chromium } = require('playwright');
const FormPage = require('./pages/FormPage');
const { processLead } = require('./utils/leadProcessor');

console.log('✅ Running TRA-CPM test...');

(async () => {
    const browser = await chromium.launch({ headless: false, slowMo: 800 });
    const page = await browser.newPage();

    try {
        const brand = {
            name: "TRA-CPM",
            url: "https://flmtra.com/?a=659&oc=763&c=2225&s1=",
            sheet: "TRA-CPM",
            sliderAmount: "9000",
            state: "Rhode Island",
            firstName: "ckmtestpixel",
            lastName: "ckmtestpixel",
            email: "ckmtestpixel@gmail.com",
            phone: "401-453-0576"
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