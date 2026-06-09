const { chromium } = require('playwright');
const FormPage = require('./pages/FormPage');
const { processLead } = require('./utils/leadProcessor');
const path = require('path');
const fs = require('fs');

console.log('✅ Running Second Chance Tax Relief (X) with Video & Trace Recording...');
console.log('✅ Tracking URL: https://flm-sctr-trk.com/?a=659&oc=684&c=1818&s1=');
console.log('✅ Sheet Name: Second Chance Tax Relief (X)');

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
            name: "Second Chance Tax Relief (X)",
            url: "https://flm-sctr-trk.com/?a=659&oc=684&c=1818&s1=",
            sheet: "Second Chance Tax Relief (X)",
            sliderAmount: "10000",
            state: "Texas",
            firstName: "ckmtestpixel",
            lastName: "ckmtestpixel",
            email: "ckmtestpixel@gmail.com",
            phone: "512-555-1234"
        };

        const result = await processLead(brand, page);
        console.log('✅ Second Chance Tax Relief (X) Test completed:', result);

        // Stop tracing and save to zip file
        await context.tracing.stop({ path: path.join(traceDir, 'Second_Chance_Tax_Relief_X_Desktop.zip') });
        console.log(`\n📋 Trace Report saved to: traces/Second_Chance_Tax_Relief_X_Desktop.zip`);

    } catch (error) {
        console.error('❌ Second Chance Tax Relief (X) Test failed:', error);
    } finally {
        await page.waitForTimeout(3000);
        await browser.close();
    }
})();