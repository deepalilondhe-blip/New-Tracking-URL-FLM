const { firefox } = require('playwright');
const FormPage = require('./pages/FormPage');
const { processLead } = require('./utils/leadProcessor');
const path = require('path');
const fs = require('fs');

// Disable all rotational logic - use exact values only
process.env.DISABLE_ROTATION = "true";
process.env.OVERRIDE_SLIDER = "33000";
process.env.FORCE_EXACT_PHONE = "true";

console.log('✅ Running Senior Tax Defence-Main with EXACT VALUES ONLY (NO ROTATION)...');
console.log('✅ Tracking URL: https://flmtrk.com/?a=659&oc=714&c=1892&s1=');
console.log('✅ Sheet Name: Senior Tax Defence-Main');
console.log('✅ Browser: Firefox');
console.log('✅ Device: Windows');
console.log('✅ Slider Value: 33000 (EXACT)');
console.log('✅ State: Colorado (EXACT)');
console.log('✅ Phone: 970-717-4901 (EXACT)');

(async () => {
    const traceDir = path.join(__dirname, 'traces');
    if (!fs.existsSync(traceDir)) fs.mkdirSync(traceDir);

    const browser = await firefox.launch({ headless: false, slowMo: 800 });
    const context = await browser.newContext({
        recordVideo: { dir: 'traces/videos/' },
        viewport: { width: 1280, height: 720 },
        userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:128.0) Gecko/20100101 Firefox/128.0'
    });
    await context.tracing.start({ screenshots: true, snapshots: true, sources: true });
    const page = await context.newPage();

    try {
        const brand = {
            name: "Senior Tax Defence-Main",
            url: "https://flmtrk.com/?a=659&oc=714&c=1892&s1=",
            sheet: "Senior Tax Defence-Main",
            sliderAmount: "33000",
            state: "Colorado",
            firstName: "ckmtestpixel",
            lastName: "ckmtestpixel",
            email: "ckmtestpixel@gmail.com",
            phone: "970-717-4901",
            disableRotation: true,
            forceExactValues: true,
            createNewSheetTab: true
        };

        const result = await processLead(brand, page);
        console.log('✅ Senior Tax Defence-Main Test completed:', result);

        await context.tracing.stop({ path: path.join(traceDir, 'Senior_Tax_Defence_FINAL.zip') });
        console.log(`\n📋 Trace Report saved to: traces/Senior_Tax_Defence_FINAL.zip`);

    } catch (error) {
        console.error('❌ Senior Tax Defence-Main Test failed:', error);
    } finally {
        await page.waitForTimeout(3000);
        await browser.close();
    }
})();