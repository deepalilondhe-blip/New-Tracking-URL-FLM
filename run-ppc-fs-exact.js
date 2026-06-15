const { firefox } = require('playwright');
const { processLead } = require('./utils/leadProcessor');
const path = require('path');
const fs = require('fs');

// Set exact overrides for the runner
process.env.OVERRIDE_SLIDER = "8000";
process.env.OVERRIDE_STATE = "Colorado";
process.env.OVERRIDE_PHONE = "303-322-4154";
process.env.PROCESS_BROWSER = "firefox";
process.env.PROCESS_LABEL = "W-Firefox";

console.log('✅ Running PPC FS Campaign with EXACT VALUES ONLY (NO ROTATION)...');
console.log('✅ Tracking URL: https://flmtra.com/?a=659&oc=841&c=2210&s1=');
console.log('✅ Sheet Name: PPC-FS');
console.log('✅ Browser: Firefox');
console.log('✅ Device: Windows');
console.log('✅ Slider Value: 8000 (EXACT)');
console.log('✅ State: Colorado (EXACT)');
console.log('✅ Phone: 303-322-4154 (EXACT)');

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
            id: "ppc-fs",
            name: "PPC FS",
            url: "https://flmtra.com/?a=659&oc=841&c=2210&s1=",
            sheet: "PPC-FS",
            sliderAmount: "8000",
            state: "Colorado",
            firstName: "ckmtestpixel",
            lastName: "ckmtestpixel",
            email: "ckmtestpixel@gmail.com",
            phone: "303-322-4154",
            disableRotation: true,
            forceExactValues: true,
            forceExactPhone: true,
            forceExactState: true,
            disableRangeMapping: true,
            createNewSheetTab: true
        };

        const result = await processLead(brand, page);
        console.log('✅ PPC FS Test completed:', result);

        await context.tracing.stop({ path: path.join(traceDir, 'PPC_FS_EXACT.zip') });
        console.log(`\n📋 Trace Report saved to: traces/PPC_FS_EXACT.zip`);

    } catch (error) {
        console.error('❌ PPC FS Test failed:', error);
    } finally {
        await page.waitForTimeout(3000);
        await browser.close();
    }
})();
