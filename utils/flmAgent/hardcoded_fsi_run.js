const { chromium, devices } = require('playwright');
const { processLead } = require('../leadProcessor');
const path = require('path');
const fs = require('fs');

console.log('📋 Running Hardcoded FSI URL in Tablet Emulation (Safari/iPad)...');

(async () => {
    const traceDir = path.join(__dirname, '../../traces');
    if (!fs.existsSync(traceDir)) fs.mkdirSync(traceDir, { recursive: true });

    const browser = await chromium.launch({
        headless: false,
        slowMo: 1400
    });

    const iPad = devices['iPad Pro 11'];

    const context = await browser.newContext({
        ...iPad,
        viewport: { width: 834, height: 1194 },
        isMobile: true,
        hasTouch: true,
        recordVideo: { dir: path.join(__dirname, '../../traces/videos/') },
        acceptDownloads: true,
        bypassCSP: true,
        javaScriptEnabled: true
    });

    await context.setDefaultTimeout(25000);
    await context.setDefaultNavigationTimeout(35000);

    await context.tracing.start({
        screenshots: true,
        snapshots: true,
        sources: true
    });

    const page = await context.newPage();

    // ENFORCE STRICT OVERRIDES FOR THIS RUN
    process.env.OVERRIDE_SLIDER = "1000";
    process.env.OVERRIDE_STATE = "Arizona";
    process.env.OVERRIDE_PHONE = "928-725-2478";

    try {
        const brand = {
            name: "Hardcoded FSI Tablet",
            url: "https://fsimlf-trk.com/?a=659&oc=159&c=111&s1=",
            sheet: "FSI - MAIN",
            sliderAmount: "1000",
            state: "Arizona",
            firstName: "ckmtestpixel",
            lastName: "ckmtestpixel",
            email: "ckmtestpixel@gmail.com",
            phone: "928-725-2478"
        };

        console.log('⏳ Waiting extra 2 seconds before form processing...');
        await page.waitForTimeout(2000);

        const result = await processLead(brand, page);
        console.log('✅ Hardcoded FSI Test completed:', result);

        await context.tracing.stop({ path: path.join(traceDir, 'Hardcoded_FSI_Tablet.zip') });
        console.log(`\n📋 Trace Report saved`);

    } catch (error) {
        console.error('❌ Hardcoded FSI Test failed:', error);
    } finally {
        await page.waitForTimeout(3000);
        await browser.close();
    }
})();
