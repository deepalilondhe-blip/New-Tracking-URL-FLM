const { firefox } = require('playwright');
const { processLead } = require('./utils/leadProcessor');
const path = require('path');
const fs = require('fs');

// Set exact overrides for the runner
process.env.OVERRIDE_SLIDER = "19000";
process.env.OVERRIDE_STATE = "Colorado";
process.env.OVERRIDE_PHONE = "970-355-3099";
process.env.PROCESS_BROWSER = "firefox";
process.env.PROCESS_LABEL = "W-Firefox";

console.log('✅ Running Everest Tax Releif(X) with Video & Trace Recording...');
console.log('✅ Tracking URL: https://mlf-trk.com/?a=659&oc=812&c=2498&s1=');
console.log('✅ Sheet Name: Everest Tax Releif(X)');
console.log('✅ Mode: HEADED (Browser visible)');
console.log('✅ Test Data: First Name: ckmtestpixel, Last Name: ckmtestpixel, Email: ckmtestpixel@gmail.com');

(async () => {
    // Create traces directory if it doesn't exist
    const traceDir = path.join(__dirname, 'traces');
    if (!fs.existsSync(traceDir)) fs.mkdirSync(traceDir);

    // Launch Firefox as requested
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
            id: "everest-tr-x",
            name: "Everest Tax Releif(X)",
            url: "https://mlf-trk.com/?a=659&oc=812&c=2498&s1=",
            sheet: "Everest Tax Releif(X)",
            sliderAmount: "19000",
            state: "Colorado",
            firstName: "ckmtestpixel",
            lastName: "ckmtestpixel",
            email: "ckmtestpixel@gmail.com",
            phone: "970-355-3099",
            disableRotation: true,
            forceExactValues: true,
            forceExactPhone: true,
            forceExactState: true,
            createNewSheetTab: true
        };

        const result = await processLead(brand, page);
        console.log('✅ Everest Tax Releif(X) Test completed:', result);

        // Stop tracing and save to zip file
        await context.tracing.stop({ path: path.join(traceDir, 'Everest_Tax_Releif_X_Desktop.zip') });
        console.log(`\n📋 Trace Report saved to: traces/Everest_Tax_Releif_X_Desktop.zip`);

    } catch (error) {
        console.error('❌ Everest Tax Releif(X) Test failed:', error);
    } finally {
        await page.waitForTimeout(3000);
        await browser.close();
    }
})();
