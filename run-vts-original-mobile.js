const { chromium, devices } = require('playwright');
const { processLead } = require('./utils/leadProcessor');
const path = require('path');
const fs = require('fs');

console.log('📱 Running VTS Original Campaign in iPhone 17 Pro Emulation...');
console.log('📱 Optimized viewport, custom styled headers, and timing values');

(async () => {
    const traceDir = path.join(__dirname, 'traces');
    if (!fs.existsSync(traceDir)) fs.mkdirSync(traceDir);

    const browser = await chromium.launch({
        headless: false,
        slowMo: 1400,
        args: ['--start-maximized']
    });

    // iPhone 17 Pro specs
    const iPhone = devices['iPhone 15 Pro Max'];
    const iPhone17Pro = {
        ...iPhone,
        viewport: { width: 430, height: 932 },
        deviceScaleFactor: 3,
        userAgent: iPhone.userAgent.replace('iPhone OS 17_0', 'iPhone OS 18_0')
    };

    const context = await browser.newContext({
        ...iPhone17Pro,
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
            name: "VTS Original Mobile",
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
        console.log('✅ iPhone 17 Pro VTS Original Test completed:', result);

        await context.tracing.stop({ path: path.join(traceDir, 'VTS_Original_iPhone17Pro.zip') });
        console.log(`\n📱 Fixed Mobile Trace Report saved`);

    } catch (error) {
        console.error('❌ iPhone 17 Pro VTS Original Test failed:', error);
    } finally {
        await page.waitForTimeout(3000);
        await browser.close();
    }
})();
