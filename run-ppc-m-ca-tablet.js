const { chromium, devices } = require('playwright');
const { processLead } = require('./utils/leadProcessor');
const path = require('path');
const fs = require('fs');

console.log('📋 Running PPC-M/CA Campaign in iPad (Tablet) Emulation...');
console.log('📋 Fixed wide tablet viewport, custom header styling, spinner glass overlay, and timing issues');

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
            name: "PPC-M/CA Tablet",
            url: "https://flmtra.com/?a=659&oc=822&c=2210&s1=",
            sheet: "PPC-M/CA",
            sliderAmount: "20,000",
            state: "Nebraska",
            firstName: "ckmtestpixel",
            lastName: "ckmtestpixel",
            email: "ckmtestpixel@gmail.com",
            phone: "402-919-7047"
        };

        console.log('⏳ Waiting extra 2 seconds before form processing...');
        await page.waitForTimeout(2000);

        const result = await processLead(brand, page);
        console.log('✅ iPad PPC-M/CA Test completed:', result);

        await context.tracing.stop({ path: path.join(traceDir, 'PPC_MCA_iPad.zip') });
        console.log(`\n📋 Fixed Tablet Trace Report saved`);

    } catch (error) {
        console.error('❌ iPad PPC-M/CA Test failed:', error);
    } finally {
        await page.waitForTimeout(3000);
        await browser.close();
    }
})();
