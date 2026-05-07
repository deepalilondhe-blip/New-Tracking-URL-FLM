const { chromium, devices } = require('playwright');
const { processLead } = require('./utils/leadProcessor');
const path = require('path');
const fs = require('fs');

console.log('📱 Running TRA-DT3 Campaign in iPhone Emulation...');
console.log('📱 This will automatically set Device Type to "M" (Mobile) in the Google Sheet!');

(async () => {
    const traceDir = path.join(__dirname, 'traces');
    if (!fs.existsSync(traceDir)) fs.mkdirSync(traceDir);

    const browser = await chromium.launch({ headless: false, slowMo: 800 });

    // Load iPhone 14 Pro device descriptors (User-Agent, DeviceScaleFactor, Touch enabled, etc.)
    const iPhone = devices['iPhone 14 Pro'];

    // Create a mobile context mimicking an iPhone but with a slightly wider visual workspace viewport
    const context = await browser.newContext({
        ...iPhone,
        viewport: { width: 450, height: 780 }, // Spacious layout to display the physical iPhone bezel perfectly!
        recordVideo: { dir: 'traces/videos/' }
    });

    // Start tracing to capture mobile snapshots
    await context.tracing.start({ screenshots: true, snapshots: true, sources: true });

    const page = await context.newPage();

    try {
        const brand = {
            name: "TRA-DT3 Mobile",
            url: "https://flmtra.com/?a=659&oc=792&c=2386&s1=",
            sheet: "TRA-DT3",
            sliderAmount: "42,000",
            state: "Oklahoma",
            phone: "918-792-0557"
        };

        const result = await processLead(brand, page);
        console.log('✅ Mobile TRA-DT3 Test completed:', result);

        // Save mobile trace ZIP file
        await context.tracing.stop({ path: path.join(traceDir, 'TRA_DT3_Mobile.zip') });
        console.log(`\n📂 Mobile Trace Report saved to: traces/TRA_DT3_Mobile.zip`);

    } catch (error) {
        console.error('❌ Mobile TRA-DT3 Test failed:', error);
    } finally {
        await page.waitForTimeout(3000);
        await browser.close();
    }
})();
