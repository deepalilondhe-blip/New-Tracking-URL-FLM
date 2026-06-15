const { firefox } = require('playwright');
const FormPage = require('./pages/FormPage');
const { processLead } = require('./utils/leadProcessor');
const path = require('path');
const fs = require('fs');

console.log('✅ Running Senior Tax Defence-Main with Video & Trace Recording...');
console.log('✅ Tracking URL: https://flmtrk.com/?a=659&oc=714&c=1892&s1=');
console.log('✅ Sheet Name: Senior Tax Defence-Main');

(async () => {
    const traceDir = path.join(__dirname, 'traces');
    if (!fs.existsSync(traceDir)) fs.mkdirSync(traceDir);

    const browser = await firefox.launch({ headless: false, slowMo: 800 });

    const context = await browser.newContext({
        recordVideo: { dir: 'traces/videos/' }
    });

    await context.tracing.start({ screenshots: true, snapshots: true, sources: true });

    const page = await context.newPage();

    try {
        const brand = {
            id: "senior-tax-defence-main",
            name: "Senior Tax Defence-Main",
            url: "https://flmtrk.com/?a=659&oc=714&c=1892&s1=",
            sheet: "Senior Tax Defence-Main",
            sliderAmount: "33000",
            state: "Colorado",
            firstName: "ckmtestpixel",
            lastName: "ckmtestpixel",
            email: "ckmtestpixel@gmail.com",
            phone: "970-717-4901"
        };

        process.env.OVERRIDE_SLIDER = brand.sliderAmount;
        process.env.OVERRIDE_STATE = brand.state;
        process.env.OVERRIDE_PHONE = brand.phone;

        const result = await processLead(brand, page);
        console.log('✅ Senior Tax Defence-Main Test completed:', result);

        await context.tracing.stop({ path: path.join(traceDir, 'Senior_Tax_Defence_Main_Desktop.zip') });
        console.log(`\n📋 Trace Report saved to: traces/Senior_Tax_Defence_Main_Desktop.zip`);

    } catch (error) {
        console.error('❌ Senior Tax Defence-Main Test failed:', error);
    } finally {
        await page.waitForTimeout(3000);
        await browser.close();
    }
})();
