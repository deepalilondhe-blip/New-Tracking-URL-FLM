const { chromium, devices } = require('playwright');
const { processLead } = require('./utils/leadProcessor');
const path = require('path');
const fs = require('fs');

console.log('📱 Running FSI-PPC2 Campaign in iPhone 17 Pro Emulation...');
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
            name: "FSI-PPC2 Mobile",
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
        console.log('✅ iPhone 17 Pro FSI-PPC2 Test completed:', result);

        await context.tracing.stop({ path: path.join(traceDir, 'FSI_PPC2_iPhone17Pro.zip') });
        console.log(`\n📱 Fixed Mobile Trace Report saved`);

    } catch (error) {
        console.error('❌ iPhone 17 Pro FSI-PPC2 Test failed:', error);
    } finally {
        await page.waitForTimeout(3000);
        await browser.close();
    }
})();
