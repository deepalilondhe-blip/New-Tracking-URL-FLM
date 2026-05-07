const { chromium, devices } = require('playwright');
const { processLead } = require('./utils/leadProcessor');
const path = require('path');
const fs = require('fs');

console.log('💻 Running TRA-DT3 Campaign in iPad Pro Tablet Emulation...');
console.log('💻 This will automatically set Device Type to "M" (Mobile/Tablet) in the Google Sheet, with a gorgeous iPad Pro mockup!');

(async () => {
    const traceDir = path.join(__dirname, 'traces');
    if (!fs.existsSync(traceDir)) fs.mkdirSync(traceDir);

    const browser = await chromium.launch({ headless: false, slowMo: 800 });

    // Load iPad Pro 11 device descriptors (User-Agent, DeviceScaleFactor, Touch enabled, etc.)
    const iPad = devices['iPad Pro 11'];

    // Create a tablet context mimicking an iPad but scaled to fit standard laptop/desktop screens perfectly!
    const context = await browser.newContext({
        ...iPad,
        viewport: { width: 800, height: 800 }, // Fits standard 1080p and lower laptop screens without vertical cutting!
        recordVideo: { dir: 'traces/videos/' }
    });

    // Start tracing to capture tablet snapshots
    await context.tracing.start({ screenshots: true, snapshots: true, sources: true });

    const page = await context.newPage();

    try {
        const brand = {
            name: "TRA-DT3 Tablet",
            url: "https://flmtra.com/?a=659&oc=792&c=2386&s1=",
            sheet: "TRA-DT3",
            sliderAmount: "42,000",
            state: "Oklahoma",
            phone: "918-792-0557"
        };

        const result = await processLead(brand, page);
        console.log('✅ Tablet TRA-DT3 Test completed:', result);

        // Save tablet trace ZIP file
        await context.tracing.stop({ path: path.join(traceDir, 'TRA_DT3_Tablet.zip') });
        console.log(`\n📂 Tablet Trace Report saved to: traces/TRA_DT3_Tablet.zip`);

    } catch (error) {
        console.error('❌ Tablet TRA-DT3 Test failed:', error);
    } finally {
        await page.waitForTimeout(3000);
        await browser.close();
    }
})();
