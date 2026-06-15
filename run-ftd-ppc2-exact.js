const { firefox } = require('playwright');
const FormPage = require('./pages/FormPage');
const { processLead } = require('./utils/leadProcessor');
const path = require('path');
const fs = require('fs');

// Disable all rotational logic - use exact values only
process.env.DISABLE_ROTATION = "true";
process.env.OVERRIDE_SLIDER = "0-9999";
process.env.FORCE_EXACT_PHONE = "true";

console.log('✅ Running FTD-PPC2 with EXACT VALUES ONLY (NO ROTATION)...');
console.log('✅ Tracking URL: https://mlfftd.com/?a=659&oc=751&c=2207&s1=');
console.log('✅ Sheet Name: FTD-PPC2');
console.log('✅ Browser: Firefox');
console.log('✅ Device: Windows');
console.log('✅ Slider Value: 0-9999 (EXACT DROPDOWN VALUE)');
console.log('✅ State: Colorado (EXACT)');
console.log('✅ Phone: 970-628-1044 (EXACT)');

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
            name: "FTD-PPC2",
            url: "https://mlfftd.com/?a=659&oc=751&c=2207&s1=",
            sheet: "FTD-PPC2",
            sliderAmount: "0-9999",
            state: "Colorado",
            firstName: "ckmtestpixel",
            lastName: "ckmtestpixel",
            email: "ckmtestpixel@gmail.com",
            phone: "970-628-1044",
            disableRotation: true,
            forceExactValues: true,
            createNewSheetTab: true
        };

        const result = await processLead(brand, page);
        console.log('✅ FTD-PPC2 Test completed:', result);

        await context.tracing.stop({ path: path.join(traceDir, 'FTD_PPC2_EXACT.zip') });
        console.log(`\n📋 Trace Report saved to: traces/FTD_PPC2_EXACT.zip`);

    } catch (error) {
        console.error('❌ FTD-PPC2 Test failed:', error);
    } finally {
        await page.waitForTimeout(3000);
        await browser.close();
    }
})();