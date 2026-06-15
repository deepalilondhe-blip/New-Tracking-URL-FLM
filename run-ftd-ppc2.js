const { firefox } = require('playwright');
const FormPage = require('./pages/FormPage');
const { processLead } = require('./utils/leadProcessor');
const path = require('path');
const fs = require('fs');

console.log('✅ Running FTD-PPC2 with Video & Trace Recording...');
console.log('✅ Tracking URL: https://mlfftd.com/?a=659&oc=751&c=2207&s1=');
console.log('✅ Sheet Name: FTD-PPC2');

(async () => {
    // Create traces directory if it doesn't exist
    const traceDir = path.join(__dirname, 'traces');
    if (!fs.existsSync(traceDir)) fs.mkdirSync(traceDir);

    const browser = await firefox.launch({ headless: false, slowMo: 800 });

    // Create a context with video recording enabled
    const context = await browser.newContext({
        recordVideo: { dir: 'traces/videos/' }
    });

    // Start tracing to capture screenshots and DOM snapshots
    await context.tracing.start({ screenshots: true, snapshots: true, sources: true });

    const page = await context.newPage();

    try {
        const brand = {
            id: "ftd-ppc2",
            name: "FTD-PPC2",
            url: "https://mlfftd.com/?a=659&oc=751&c=2207&s1=",
            sheet: "FTD-PPC2",
            sliderAmount: "0-9999",
            state: "Colorado",
            firstName: "ckmtestpixel",
            lastName: "ckmtestpixel",
            email: "ckmtestpixel@gmail.com",
            phone: "970-628-1044"
        };

        // Override environment variables to force specific inputs
        process.env.OVERRIDE_SLIDER = brand.sliderAmount;
        process.env.OVERRIDE_STATE = brand.state;
        process.env.OVERRIDE_PHONE = brand.phone;

        const result = await processLead(brand, page);
        console.log('✅ FTD-PPC2 Test completed:', result);

        // Stop tracing and save to zip file
        await context.tracing.stop({ path: path.join(traceDir, 'FTD_PPC2_Desktop.zip') });
        console.log(`\n📋 Trace Report saved to: traces/FTD_PPC2_Desktop.zip`);

    } catch (error) {
        console.error('❌ FTD-PPC2 Test failed:', error);
    } finally {
        await page.waitForTimeout(3000);
        await browser.close();
    }
})();
