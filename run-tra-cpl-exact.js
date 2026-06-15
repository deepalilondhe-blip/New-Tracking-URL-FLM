const { firefox } = require('playwright');
const FormPage = require('./pages/FormPage');
const { processLead } = require('./utils/leadProcessor');
const path = require('path');
const fs = require('fs');

// Disable all rotational logic - use exact values only
process.env.OVERRIDE_SLIDER = "36000";
process.env.OVERRIDE_STATE = "Colorado";
process.env.OVERRIDE_PHONE = "303-649-9431";
process.env.PROCESS_BROWSER = "firefox";
process.env.PROCESS_LABEL = "W-Firefox";

console.log('✅ Running TRA-CPL with EXACT VALUES ONLY (NO ROTATION)...');
console.log('✅ Tracking URL: https://flmtra.com/?a=659&oc=756&c=2210&s1=');
console.log('✅ Sheet Name: TRA-CPL');
console.log('✅ Browser: Firefox');
console.log('✅ Device: Windows');
console.log('✅ Slider Value: 36000 (EXACT)');
console.log('✅ State: Colorado (EXACT)');
console.log('✅ Phone: 303-649-9431 (EXACT)');

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
            name: "TRA-CPL",
            url: "https://flmtra.com/?a=659&oc=756&c=2210&s1=",
            sheet: "TRA-CPL",
            sliderAmount: "36000",
            state: "Colorado",
            firstName: "ckmtestpixel",
            lastName: "ckmtestpixel",
            email: "ckmtestpixel@gmail.com",
            phone: "303-649-9431",
            disableRotation: true,
            forceExactValues: true,
            forceExactPhone: true,
            forceExactState: true,
            disableRangeMapping: true,
            createNewSheetTab: true
        };

        const result = await processLead(brand, page);
        console.log('✅ TRA-CPL Test completed:', result);

        await context.tracing.stop({ path: path.join(traceDir, 'TRA_CPL_EXACT.zip') });
        console.log(`\n📋 Trace Report saved to: traces/TRA_CPL_EXACT.zip`);

    } catch (error) {
        console.error('❌ TRA-CPL Test failed:', error);
    } finally {
        await page.waitForTimeout(3000);
        await browser.close();
    }
})();