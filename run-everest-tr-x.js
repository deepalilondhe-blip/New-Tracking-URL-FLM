const { chromium } = require('playwright');
const FormPage = require('./pages/FormPage');
const { processLead } = require('./utils/leadProcessor');
const path = require('path');
const fs = require('fs');

console.log('✅ Running Everest Tax Releif(X) with Video & Trace Recording...');
console.log('✅ Tracking URL: https://mlf-trk.com/?a=659&oc=812&c=2498&s1=');
console.log('✅ Sheet Name: Everest Tax Releif(X)');

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
            name: "Everest Tax Releif(X)",
            url: "https://mlf-trk.com/?a=659&oc=812&c=2498&s1=",
            sheet: "Everest Tax Releif(X)",
            sliderAmount: "70000",
            state: "California",
            firstName: "ckmtestpixel",
            lastName: "ckmtestpixel",
            email: "ckmtestpixel@gmail.com",
            phone: "406-314-1715"
        };

        const result = await processLead(brand, page);
        console.log('✅ Everest Tax Releif(X) Test completed:', result);

        // Stop tracing and save to zip file
        await context.tracing.stop({ path: path.join(traceDir, 'Everest_Tax_Releif_X_Desktop.zip') });
        console.log(`\n📋 Trace Report saved to: traces/Everest_Tax_Releif_X_Desktop.zip`);

    } catch (error) {
        console.error('❌ Everest Tax Releif(X) Test failed:', error);
    } finally {
        await page.waitForTimeout(3000);
        await browser.close();
    }
})();
