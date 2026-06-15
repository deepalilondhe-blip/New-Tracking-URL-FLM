const { firefox } = require('playwright');
const FormPage = require('./pages/FormPage');
const { processLead } = require('./utils/leadProcessor');
const path = require('path');
const fs = require('fs');

console.log('✅ Running 1800 Fresh Tax Original with Video & Trace Recording...');
console.log('✅ Tracking URL: https://mlf-1800-trk.com/?a=659&oc=337&c=617&s1=');
console.log('✅ Sheet Name: Original');

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
            id: "1800-fresh-tax-original",
            name: "1800 Fresh Tax Original",
            url: "https://mlf-1800-trk.com/?a=659&oc=337&c=617&s1=",
            sheet: "Original",
            sliderAmount: "14000",
            state: "Colorado",
            firstName: "ckmtestpixel",
            lastName: "ckmtestpixel",
            email: "ckmtestpixel@gmail.com",
            phone: "303-447-3376"
        };

        // Enforce the user-specified overrides so rotational scheduler logic is bypassed
        process.env.OVERRIDE_SLIDER = brand.sliderAmount;
        process.env.OVERRIDE_STATE = brand.state;
        process.env.OVERRIDE_PHONE = brand.phone;

        const result = await processLead(brand, page);
        console.log('✅ 1800 Fresh Tax Original Test completed:', result);

        // Stop tracing and save to zip file
        await context.tracing.stop({ path: path.join(traceDir, 'Fresh_Tax_Original_Desktop.zip') });
        console.log(`\n📋 Trace Report saved to: traces/Fresh_Tax_Original_Desktop.zip`);

    } catch (error) {
        console.error('❌ 1800 Fresh Tax Original Test failed:', error);
    } finally {
        await page.waitForTimeout(3000);
        await browser.close();
    }
})();
