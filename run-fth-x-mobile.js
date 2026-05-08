const { chromium, devices } = require('playwright');
const { processLead } = require('./utils/leadProcessor');
const path = require('path');
const fs = require('fs');

console.log('📱 Running FTH-X Campaign in iPhone 15 Pro Max Emulation...');

(async () => {
    const traceDir = path.join(__dirname, 'traces');
    if (!fs.existsSync(traceDir)) fs.mkdirSync(traceDir);

    const browser = await chromium.launch({
        headless: false,
        slowMo: 1400,
        args: ['--start-maximized']
    });

    const iPhone = devices['iPhone 15 Pro Max'];
    const iPhoneConfig = {
        ...iPhone,
        viewport: { width: 430, height: 932 },
        deviceScaleFactor: 3,
        userAgent: iPhone.userAgent.replace('iPhone OS 17_0', 'iPhone OS 18_0')
    };

    const context = await browser.newContext({
        ...iPhoneConfig,
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
            name: "FTH-X Mobile",
            url: "https://fthmlf-trk.com/?a=659&oc=821&c=81&s1=",
            sheet: "FTH-X",
            sliderAmount: "9,000",
            state: "Rhode Island",
            firstName: "ckmtestpixel",
            lastName: "ckmtestpixel",
            email: "ckmtestpixel@gmail.com",
            phone: "401-453-0576"
        };

        console.log('⏳ Waiting extra 2 seconds before form processing...');
        await page.waitForTimeout(2000);

        const result = await processLead(brand, page);
        console.log('✅ iPhone FTH-X Test completed:', result);

        await context.tracing.stop({ path: path.join(traceDir, 'FTH-X_Mobile.zip') });
        console.log(`\n📱 Mobile Trace Report saved`);

    } catch (error) {
        console.error('❌ iPhone FTH-X Test failed:', error);
    } finally {
        await page.waitForTimeout(3000);
        await browser.close();
    }
})();
