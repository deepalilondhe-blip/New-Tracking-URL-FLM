const { chromium, devices } = require('playwright');
const { processLead } = require('./utils/leadProcessor');
const path = require('path');
const fs = require('fs');

console.log('📋 Running VTS Original Campaign in iPad (Tablet) Emulation...');
console.log('📋 Fixed wide tablet viewport, custom header styling, and timing issues');

(async () => {
    const traceDir = path.join(__dirname, 'traces');
    if (!fs.existsSync(traceDir)) fs.mkdirSync(traceDir);

    const browser = await chromium.launch({
        headless: false,
        slowMo: 1400,
        args: ['--start-maximized']
    });

    // iPad Pro 11" specs
    const iPad = devices['iPad Pro 11'];

    const context = await browser.newContext({
        ...iPad,
        viewport: { width: 834, height: 1194 },
        isMobile: true,
        hasTouch: true,
        recordVideo: { dir: 'traces/videos/' },
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

    try {
        const brand = {
            name: "VTS Original Tablet",
            url: "https://mlfvts-trk.com/?a=659&oc=323&c=569&s1=",
            sheet: "VTS-Original",
            sliderAmount: "70000",
            state: "Idaho",
            firstName: "ckmtestpixel",
            lastName: "ckmtestpixel",
            email: "ckmtestpixel@gmail.com",
            phone: "406-314-1715"
        };

        console.log('⏳ Waiting extra 2 seconds before form processing...');
        await page.waitForTimeout(2000);

        const result = await processLead(brand, page);
        console.log('✅ iPad VTS Original Test completed:', result);

        await context.tracing.stop({ path: path.join(traceDir, 'VTS_Original_iPad.zip') });
        console.log(`\n📋 Fixed Tablet Trace Report saved`);

    } catch (error) {
        console.error('❌ iPad VTS Original Test failed:', error);
    } finally {
        await page.waitForTimeout(3000);
        await browser.close();
    }
})();
