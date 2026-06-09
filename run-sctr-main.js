const { chromium } = require('playwright');
const FormPage = require('./pages/FormPage');
const { processLead } = require('./utils/leadProcessor');
const path = require('path');
const fs = require('fs');

console.log('✅ Running SCTR-Main in HEADED MODE (Visible Browser)');
console.log('✅ Tracking URL: https://secure-sctr.com/?a=659&oc=800&c=2432&s1=');
console.log('✅ Sheet Name: SCTR-Main');
console.log('✅ Device: Desktop');

(async () => {
    // Create traces directory if it doesn't exist
    const traceDir = path.join(__dirname, 'traces');
    if (!fs.existsSync(traceDir)) fs.mkdirSync(traceDir);

    // 🔹 HEADED MODE - Browser window will be visible
    const browser = await chromium.launch({ 
        headless: false, 
        slowMo: 800,
        args: ['--start-maximized']
    });

    // Create a context with video recording enabled
    const context = await browser.newContext({
        recordVideo: { dir: 'traces/videos/' },
        viewport: { width: 1920, height: 1080 }
    });

    // Start tracing to capture screenshots and DOM snapshots
    await context.tracing.start({ screenshots: true, snapshots: true, sources: true });

    const page = await context.newPage();

    try {
        const brand = {
            name: "SCTR-Main",
            url: "https://secure-sctr.com/?a=659&oc=800&c=2432&s1=",
            sheet: "SCTR-Main",
            sliderAmount: "9000",
            state: "Arkansas",
            firstName: "ckmtestpixel",
            lastName: "ckmtestpixel",
            email: "ckmtestpixel@gmail.com",
            phone: "870-795-2371"
        };

        console.log('\n📋 Lead Data:');
        console.log('First Name:', brand.firstName);
        console.log('Last Name:', brand.lastName);
        console.log('Email:', brand.email);
        console.log('Phone:', brand.phone);
        console.log('State:', brand.state);
        console.log('Slider Value:', brand.sliderAmount);
        console.log('\n🚀 Starting browser automation...');

        const result = await processLead(brand, page);
        console.log('\n✅ SCTR-Main Test completed successfully:', result);

        // Stop tracing and save to zip file
        await context.tracing.stop({ path: path.join(traceDir, 'SCTR_Main_Desktop.zip') });
        console.log(`\n📋 Trace Report saved to: traces/SCTR_Main_Desktop.zip`);
        
        const videoPath = await page.video().path();
        console.log(`🎥 Video Recording saved to: ${videoPath}`);

    } catch (error) {
        console.error('\n❌ SCTR-Main Test failed:', error);
    } finally {
        await browser.close();
        console.log('\n✅ Browser closed. Execution complete.');
    }
})();