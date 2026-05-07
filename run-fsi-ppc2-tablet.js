const { chromium, devices } = require('playwright');
const { processLead } = require('./utils/leadProcessor');
const path = require('path');
const fs = require('fs');

console.log('📋 Running FSI-PPC2 Campaign in iPad (Tablet) Emulation...');
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
            name: "FSI-PPC2 Tablet",
            url: "https://fsimlf-trk.com/?a=659&oc=750&c=143&s1=",
            sheet: "FSI-PPC2",
            sliderAmount: "$0-$9,999",
            state: "South Carolina",
            firstName: "ckmtestpixel",
            lastName: "ckmtestpixel",
            email: "ckmtestpixel@gmail.com",
            phone: "803-612-4270"
        };

        console.log('⏳ Waiting extra 2 seconds before form processing...');
        await page.waitForTimeout(2000);

        const result = await processLead(brand, page);
        console.log('✅ iPad FSI-PPC2 Test completed:', result);

        await context.tracing.stop({ path: path.join(traceDir, 'FSI_PPC2_iPad.zip') });
        console.log(`\n📋 Fixed Tablet Trace Report saved`);

    } catch (error) {
        console.error('❌ iPad FSI-PPC2 Test failed:', error);
    } finally {
        await page.waitForTimeout(3000);
        await browser.close();
    }
})();
