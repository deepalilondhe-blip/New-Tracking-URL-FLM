const { chromium } = require('playwright');
const FormPage = require('./pages/FormPage');
const { processLead } = require('./utils/leadProcessor');
const path = require('path');
const fs = require('fs');

console.log('✅ Running FTH-X with Video & Trace Recording...');
console.log('✅ Tracking URL: https://fthmlf-trk.com/?a=659&oc=821&c=81&s1=');
console.log('✅ Sheet Name: FTH-X');

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
            name: "FTH-X",
            url: "https://fthmlf-trk.com/?a=659&oc=821&c=81&s1=",
            sheet: "FTH-X",
            sliderAmount: "Under 500",
            state: "Arizona",
            firstName: "ckmtestpixel",
            lastName: "ckmtestpixel",
            email: "ckmtestpixel@gmail.com",
            phone: "501-325-0876"
        };

        const result = await processLead(brand, page);
        console.log('✅ FTH-X Test completed:', result);

        // Stop tracing and save to zip file
        await context.tracing.stop({ path: path.join(traceDir, 'FTH_X_Desktop.zip') });
        console.log(`\n📋 Trace Report saved to: traces/FTH_X_Desktop.zip`);

    } catch (error) {
        console.error('❌ FTH-X Test failed:', error);
    } finally {
        await page.waitForTimeout(3000);
        await browser.close();
    }
})();