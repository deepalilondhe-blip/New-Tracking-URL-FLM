const { firefox } = require('playwright');
const { processLead } = require('./utils/leadProcessor');
const path = require('path');
const fs = require('fs');

// Set exact overrides for the runner
process.env.OVERRIDE_SLIDER = "34000";
process.env.OVERRIDE_STATE = "Colorado";
process.env.OVERRIDE_PHONE = "970-506-9569";
process.env.PROCESS_BROWSER = "firefox";
process.env.PROCESS_LABEL = "W-Firefox";

console.log('✅ Running TRA-CPM Campaign with EXACT VALUES ONLY (NO ROTATION)...');
console.log('✅ Tracking URL: https://flmtra.com/?a=659&oc=763&c=2225&s1=');
console.log('✅ Sheet Name: TRA-CPM');
console.log('✅ Browser: Firefox');
console.log('✅ Device: Windows');
console.log('✅ Slider Value: 34000 (EXACT)');
console.log('✅ State: Colorado (EXACT)');
console.log('✅ Phone: 970-506-9569 (EXACT)');

(async () => {
    const traceDir = path.join(__dirname, 'traces');
    if (!fs.existsSync(traceDir)) fs.mkdirSync(traceDir);

    const browser = await firefox.launch({ headless: false, slowMo: 800 });
    const context = await browser.newContext({
        recordVideo: { dir: 'traces/videos/' },
        viewport: { width: 1280, height: 720 },
        userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:128.0) Gecko/20100101 Firefox/128.0'
    });
    await context.tracing.start({ screenshots: true, snapshots: true, sources: true });
    const page = await context.newPage();

    try {
        const brand = {
            id: "tra-cpm",
            name: "TRA-CPM",
            url: "https://flmtra.com/?a=659&oc=763&c=2225&s1=",
            sheet: "TRA-CPM",
            sliderAmount: "34000",
            state: "Colorado",
            firstName: "ckmtestpixel",
            lastName: "ckmtestpixel",
            email: "ckmtestpixel@gmail.com",
            phone: "970-506-9569",
            disableRotation: true,
            forceExactValues: true,
            forceExactPhone: true,
            forceExactState: true,
            disableRangeMapping: true,
            createNewSheetTab: true
        };

        const result = await processLead(brand, page);
        console.log('✅ TRA-CPM Test completed:', result);

        await context.tracing.stop({ path: path.join(traceDir, 'TRA_CPM_EXACT.zip') });
        console.log(`\n📋 Trace Report saved to: traces/TRA_CPM_EXACT.zip`);

    } catch (error) {
        console.error('❌ TRA-CPM Test failed:', error);
    } finally {
        await page.waitForTimeout(3000);
        await browser.close();
    }
})();
