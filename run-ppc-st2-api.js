const { request } = require('playwright');
const { processLeadApi } = require('./utils/leadProcessor');

console.log('🚀 Running PPC-ST2 with Playwright API Automation (NO BROWSER)');
console.log('✅ Tracking URL: https://flmtra.com/?a=659&oc=858&c=2210&s1=');
console.log('✅ Sheet Name: PPC-ST2');
console.log('✅ Using direct POST request automation (like curl)');

(async () => {
    const apiContext = await request.newContext({
        extraHTTPHeaders: {
            'User-Agent': 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1',
            'Accept': 'application/json, text/plain, */*',
            'Content-Type': 'application/x-www-form-urlencoded',
            'Referer': 'https://flmtra.com/'
        }
    });

    try {
        const brand = {
            name: "PPC-ST2",
            url: "https://flmtra.com/?a=659&oc=858&c=2210&s1=",
            sheet: "PPC-ST2",
            sliderAmount: "20,000",
            state: "Nebraska",
            phone: "402-919-7047",
            firstName: "ckmtestpixel",
            lastName: "ckmtestpixel",
            email: "ckmtestpixel@gmail.com"
        };

        console.log('\n📡 Sending direct API POST request...');
        const result = await processLeadApi(brand, apiContext);

        console.log('\n✅ API Automation Completed Successfully!');
        console.log('📋 Lead Response:', JSON.stringify(result, null, 2));

    } catch (error) {
        console.error('\n❌ API Automation Failed:', error.message);
        console.error('Stack:', error.stack);
    } finally {
        await apiContext.dispose();
        console.log('\n🔌 API Context closed');
    }
})();