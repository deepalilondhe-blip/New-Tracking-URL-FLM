const { chromium } = require('playwright');
const { processLead } = require('./utils/leadProcessor');
const path = require('path');
const fs = require('fs');

// Set exact overrides for the runner
process.env.OVERRIDE_SLIDER = "26000";
process.env.OVERRIDE_STATE = "Colorado";
// process.env.OVERRIDE_PHONE = "303-485-6826"; // Commented out to generate fresh dynamic phone number to avoid duplicate filter rejection
process.env.PROCESS_BROWSER = "chromium";
process.env.PROCESS_LABEL = "D-Chromium";

console.log('✅ Running Premier Tax Relief (PTR) Campaign in Chromium (Chrome)...');
console.log('✅ Tracking URL: https://mlf-trk.com/?a=659&oc=778&c=2251&s1=');
console.log('✅ Sheet Name: Premier Tax Relief (PTR)');
console.log('✅ Browser: Chrome (Chromium)');
console.log('✅ Device: Windows');
console.log('✅ Slider Value: 26000 (EXACT)');
console.log('✅ State: Colorado (EXACT)');

(async () => {
    const traceDir = path.join(__dirname, 'traces');
    if (!fs.existsSync(traceDir)) fs.mkdirSync(traceDir);

    const browser = await chromium.launch({ headless: false, slowMo: 800 });
    const context = await browser.newContext({
        recordVideo: { dir: 'traces/videos/' },
        viewport: { width: 1280, height: 720 },
        userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
    });
    await context.tracing.start({ screenshots: true, snapshots: true, sources: true });
    const page = await context.newPage();

    try {
        const brand = {
            id: "ptr-main",
            name: "Premier Tax Relief (PTR)",
            url: "https://mlf-trk.com/?a=659&oc=778&c=2251&s1=",
            sheet: "Premier Tax Relief (PTR)",
            sliderAmount: "26000",
            state: "Colorado",
            firstName: "ckmtestpixel",
            lastName: "ckmtestpixel",
            email: "ckmtestpixel@gmail.com",
            phone: "303-485-6826",
            disableRotation: true,
            forceExactValues: true,
            forceExactPhone: false, // Allow generating fresh phone to bypass duplicate filters
            forceExactState: true,
            createNewSheetTab: true
        };

        const result = await processLead(brand, page);
        console.log('✅ PTR Test completed:', result);

        await context.tracing.stop({ path: path.join(traceDir, 'PTR_EXACT.zip') });
        console.log(`\n📋 Trace Report saved to: traces/PTR_EXACT.zip`);

    } catch (error) {
        console.error('❌ PTR Test failed:', error);
    } finally {
        await page.waitForTimeout(3000);
        await browser.close();
    }
})();
