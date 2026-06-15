const { firefox } = require('playwright');
const FormPage = require('./pages/FormPage');
const { processLead } = require('./utils/leadProcessor');
const path = require('path');
const fs = require('fs');

console.log('✅ Running 1803 Fresh Tax - AFR cobranded with Video & Trace Recording...');
console.log('✅ Tracking URL: https://flmtrk.com/?a=659&oc=847&c=1867&s1=');
console.log('✅ Sheet Name: 1803 Fresh Tax - AFR cobranded');

(async () => {
    // Create traces directory if it doesn't exist
    const traceDir = path.join(__dirname, 'traces');
    if (!fs.existsSync(traceDir)) fs.mkdirSync(traceDir);

    const browser = await firefox.launch({ headless: false, slowMo: 800 });

    // Create a context with video recording enabled
    const context = await browser.newContext({
        recordVideo: { dir: 'traces/videos/' }
    });

    // Start tracing to capture screenshots and DOM snapshots
    await context.tracing.start({ screenshots: true, snapshots: true, sources: true });

    const page = await context.newPage();

    try {
        const brand = {
            id: "1803-fresh-tax-afr-cobranded",
            name: "1803 Fresh Tax - AFR cobranded",
            url: "https://flmtrk.com/?a=659&oc=847&c=1867&s1=",
            sheet: "1803 Fresh Tax - AFR cobranded",
            sliderAmount: "Less than 9999",
            state: "Colorado",
            firstName: "ckmtestpixel",
            lastName: "ckmtestpixel",
            email: "ckmtestpixel@gmail.com",
            phone: "720-544-1097"
        };

        // Enforce the user-specified overrides so rotational scheduler logic is bypassed
        process.env.OVERRIDE_SLIDER = brand.sliderAmount;
        process.env.OVERRIDE_STATE = brand.state;
        process.env.OVERRIDE_PHONE = brand.phone;

        const result = await processLead(brand, page);
        console.log('✅ 1803 Fresh Tax - AFR cobranded Test completed:', result);

        // Stop tracing and save to zip file
        await context.tracing.stop({ path: path.join(traceDir, 'Fresh_Tax_AFR_Cobranded_Desktop.zip') });
        console.log(`\n📋 Trace Report saved to: traces/Fresh_Tax_AFR_Cobranded_Desktop.zip`);

    } catch (error) {
        console.error('❌ 1803 Fresh Tax - AFR cobranded Test failed:', error);
    } finally {
        await page.waitForTimeout(3000);
        await browser.close();
    }
})();
