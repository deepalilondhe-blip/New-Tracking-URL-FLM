const { chromium } = require('playwright');
const FormPage = require('./pages/FormPage');
const { processLead } = require('./utils/leadProcessor');
const path = require('path');
const fs = require('fs');

console.log('✅ Running Senior Tax Defense (X) with Video & Trace Recording...');
console.log('✅ Tracking URL: https://flmtrk.com/?a=659&oc=831&c=2599&s1=');
console.log('✅ Sheet Name: Senior Tax Defense (X)');
console.log('✅ Mode: HEADED (Browser visible)');
console.log('✅ Test Data: First Name: ckmtestpixel, Last Name: ckmtestpixel, Email: ckmtestpixel@gmail.com');

(async () => {
    const traceDir = path.join(__dirname, 'traces');
    if (!fs.existsSync(traceDir)) fs.mkdirSync(traceDir);

    // HEADED MODE as requested (headless: false)
    const browser = await chromium.launch({ headless: false, slowMo: 800 });
    const context = await browser.newContext({
        recordVideo: { dir: 'traces/videos/' }
    });
    await context.tracing.start({ screenshots: true, snapshots: true, sources: true });
    const page = await context.newPage();

    try {
        const brand = {
            id: "senior-tax-defense-x",
            name: "Senior Tax Defense (X)",
            url: "https://flmtrk.com/?a=659&oc=831&c=2599&s1=",
            sheet: "Senior Tax Defense (X)",
            sliderAmount: "30000",
            state: "Florida",
            firstName: "ckmtestpixel",
            lastName: "ckmtestpixel",
            email: "ckmtestpixel@gmail.com",
            phone: "305-555-1234",
            createNewSheetTab: true
        };

        const result = await processLead(brand, page);
        console.log('✅ Senior Tax Defense (X) Test completed:', result);

        await context.tracing.stop({ path: path.join(traceDir, 'Senior_Tax_Defense_X_Desktop.zip') });
        console.log(`\n📋 Trace Report saved to: traces/Senior_Tax_Defense_X_Desktop.zip`);

    } catch (error) {
        console.error('❌ Senior Tax Defense (X) Test failed:', error);
    } finally {
        await page.waitForTimeout(3000);
        await browser.close();
    }
})();