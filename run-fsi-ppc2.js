const { chromium } = require('playwright');
const FormPage = require('./pages/FormPage');
const { processLead } = require('./utils/leadProcessor');
const path = require('path');
const fs = require('fs');

console.log('✅ Running FSI-PPC2 with Video & Trace Recording...');
console.log('✅ Tracking URL: https://fsimlf-trk.com/?a=659&oc=750&c=143&s1=');
console.log('✅ Sheet Name: FSI-PPC2');

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
            name: "FSI-PPC2",
            url: "https://fsimlf-trk.com/?a=659&oc=750&c=143&s1=",
            sheet: "FSI-PPC2",
            sliderAmount: "$0-$9,999",
            state: "South Carolina",
            firstName: "ckmtestpixel",
            lastName: "ckmtestpixel",
            email: "ckmtestpixel@gmail.com",
            phone: "803-612-4270"
        };

        const result = await processLead(brand, page);
        console.log('✅ FSI-PPC2 Test completed:', result);

        // Stop tracing and save to zip file
        await context.tracing.stop({ path: path.join(traceDir, 'FSI_PPC2_Desktop.zip') });
        console.log(`\n📋 Trace Report saved to: traces/FSI_PPC2_Desktop.zip`);

    } catch (error) {
        console.error('❌ FSI-PPC2 Test failed:', error);
    } finally {
        await page.waitForTimeout(3000);
        await browser.close();
    }
})();
