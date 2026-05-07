const { chromium } = require('playwright');
const FormPage = require('./pages/FormPage');
const { processLead } = require('./utils/leadProcessor');
const path = require('path');
const fs = require('fs');

console.log('✅ Running Guardian Tax Relief with Video & Trace Recording...');
console.log('✅ Tracking URL: https://mlf-gt.com/?a=659&oc=816&c=2521&s1=');
console.log('✅ Sheet Name: Guardian Tax Relief');

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
            name: "Guardian Tax Relief",
            url: "https://mlf-gt.com/?a=659&oc=816&c=2521&s1=",
            sheet: "Guardian Tax Relief", // Exact sheet name requested
            sliderAmount: "9,000",
            state: "Rhode Island",
            phone: "401-453-0576"
        };

        const result = await processLead(brand, page);
        console.log('✅ Test completed:', result);

        // Stop tracing and save the ZIP file
        await context.tracing.stop({ path: path.join(traceDir, 'Guardian_Tax_Relief.zip') });
        console.log(`\n📂 Trace Report saved to: traces/Guardian_Tax_Relief.zip`);
        console.log(`💡 To view report, run: npx playwright show-trace traces/Guardian_Tax_Relief.zip`);

    } catch (error) {
        console.error('❌ Test failed:', error);
    } finally {
        await page.waitForTimeout(3000);
        await browser.close();
    }
})();
