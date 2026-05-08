const { chromium, devices } = require('playwright');
const { processLead } = require('./utils/leadProcessor');
const path = require('path');
const fs = require('fs');

console.log('📋 Running TRA-CPM Campaign in iPad (Tablet) Emulation...');

(async () => {
    const traceDir = path.join(__dirname, 'traces');
    if (!fs.existsSync(traceDir)) fs.mkdirSync(traceDir);

    const browser = await chromium.launch({
        headless: false,
        slowMo: 1400,
        args: ['--start-maximized']
    });

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
            name: "TRA-CPM Tablet",
            url: "https://flmtra.com/?a=659&oc=763&c=2225&s1=",
            sheet: "TRA-CPM",
            sliderAmount: "9000",
            state: "Rhode Island",
            firstName: "ckmtestpixel",
            lastName: "ckmtestpixel",
            email: "ckmtestpixel@gmail.com",
            phone: "401-453-0576"
        };

        console.log('⏳ Waiting extra 2 seconds before form processing...');
        await page.waitForTimeout(2000);

        const result = await processLead(brand, page);
        console.log('✅ iPad TRA-CPM Test completed:', result);

        await context.tracing.stop({ path: path.join(traceDir, 'TRA-CPM_Tablet.zip') });
        console.log(`\n📋 Tablet Trace Report saved`);

    } catch (error) {
        console.error('❌ iPad TRA-CPM Test failed:', error);
    } finally {
        await page.waitForTimeout(3000);
        await browser.close();
    }
})();
