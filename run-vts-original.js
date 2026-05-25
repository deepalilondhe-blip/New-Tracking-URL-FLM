const { chromium } = require('playwright');
const FormPage = require('./pages/FormPage');
const { processLead } = require('./utils/leadProcessor');
const path = require('path');
const fs = require('fs');

console.log('✅ Running VTS Original with Video & Trace Recording...');
console.log('✅ Tracking URL: https://mlfvts-trk.com/?a=659&oc=323&c=569&s1=');
console.log('✅ Sheet Name: VTS-Original');

(async () => {
    // Create traces directory if it doesn't exist
    const traceDir = path.join(__dirname, 'traces');
    if (!fs.existsSync(traceDir)) fs.mkdirSync(traceDir);

    const browser = await chromium.launch({ headless: false, slowMo: 800 });

    // Create a context with video recording enabled
    const context = await browser.newContext({
        recordVideo: { dir: 'traces/videos/' }
    });

    // Start tracing to capture screenshots and DOM snapshots
    await context.tracing.start({ screenshots: true, snapshots: true, sources: true });

    const page = await context.newPage();

    try {
        const brand = {
            name: "VTS Original",
            url: "https://mlfvts-trk.com/?a=659&oc=323&c=569&s1=",
            sheet: "VTS-Original",
            sliderAmount: "70000",
            state: "Idaho",
            firstName: "ckmtestpixel",
            lastName: "ckmtestpixel",
            email: "ckmtestpixel@gmail.com",
            phone: "406-314-1715"
        };

        const result = await processLead(brand, page);
        console.log('✅ VTS Original Test completed:', result);

        // Stop tracing and save to zip file
        await context.tracing.stop({ path: path.join(traceDir, 'VTS_Original_Desktop.zip') });
        console.log(`\n📋 Trace Report saved to: traces/VTS_Original_Desktop.zip`);

    } catch (error) {
        console.error('❌ VTS Original Test failed:', error);
    } finally {
        await page.waitForTimeout(3000);
        await browser.close();
    }
})();
