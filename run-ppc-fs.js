const { chromium } = require('playwright');
const FormPage = require('./pages/FormPage');
const { processLead } = require('./utils/leadProcessor');

console.log('✅ Running PPC FS test...');

(async () => {
    const browser = await chromium.launch({ headless: false, slowMo: 800 });
    const page = await browser.newPage();

    try {
        const brand = {
            name: "PPC FS",
            url: "https://flmtra.com/?a=659&oc=841&c=2210&s1=",
            sheet: "PPC FS",
            sliderAmount: "50,000",
            state: "RI",
            firstName: "ckmtestpixel",
            lastName: "ckmtestpixel",
            email: "ckmtestpixel@gmail.com",
            phone: "401-739-6095"
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