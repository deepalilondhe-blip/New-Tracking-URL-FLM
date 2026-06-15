const { firefox } = require('playwright');
const FormPage = require('./pages/FormPage');
const { processLead } = require('./utils/leadProcessor');
const path = require('path');
const fs = require('fs');

console.log('✅ Running VTS-NE-Branded with Video & Trace Recording...');
console.log('✅ Tracking URL: https://mlfvts-trk.com/?a=659&oc=830&c=569&s1=');
console.log('✅ Sheet Name: VTS-NE-Branded');

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
            id: "vts-ne-branded",
            name: "VTS-NE-Branded",
            url: "https://mlfvts-trk.com/?a=659&oc=830&c=569&s1=",
            sheet: "VTS-NE-Branded",
            sliderAmount: "23000",
            state: "Colorado",
            firstName: "ckmtestpixel",
            lastName: "ckmtestpixel",
            email: "ckmtestpixel@gmail.com",
            phone: "303-839-4323"
        };

        // Enforce the user-specified overrides so rotational scheduler logic is bypassed
        process.env.OVERRIDE_SLIDER = brand.sliderAmount;
        process.env.OVERRIDE_STATE = brand.state;
        process.env.OVERRIDE_PHONE = brand.phone;

        const result = await processLead(brand, page);
        console.log('✅ VTS-NE-Branded Test completed:', result);

        // Stop tracing and save to zip file
        await context.tracing.stop({ path: path.join(traceDir, 'VTS_NE_Branded_Desktop.zip') });
        console.log(`\n📋 Trace Report saved to: traces/VTS_NE_Branded_Desktop.zip`);

    } catch (error) {
        console.error('❌ VTS-NE-Branded Test failed:', error);
    } finally {
        await page.waitForTimeout(3000);
        await browser.close();
    }
})();
