const { chromium } = require('playwright');
const FormPage = require('./pages/FormPage');
const { processLead } = require('./utils/leadProcessor');
const path = require('path');
const fs = require('fs');

console.log('✅ Running Empire Tax Relief (X) with Video & Trace Recording...');
console.log('✅ Tracking URL: https://jsttrk.com/?a=659&oc=844&c=2689&s1=');
console.log('✅ Sheet Name: Empire Tax Relief (X)');
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
            id: "empire-tax-relief-x",
            name: "Empire Tax Relief (X)",
            url: "https://jsttrk.com/?a=659&oc=844&c=2689&s1=",
            sheet: "Empire Tax Relief (X)",
            sliderAmount: "30000",
            state: "New York",
            firstName: "ckmtestpixel",
            lastName: "ckmtestpixel",
            email: "ckmtestpixel@gmail.com",
            phone: "212-555-1234",
            createNewSheetTab: true
        };

        const result = await processLead(brand, page);
        console.log('✅ Empire Tax Relief (X) Test completed:', result);

        await context.tracing.stop({ path: path.join(traceDir, 'Empire_Tax_Relief_X_Desktop.zip') });
        console.log(`\n📋 Trace Report saved to: traces/Empire_Tax_Relief_X_Desktop.zip`);

    } catch (error) {
        console.error('❌ Empire Tax Relief (X) Test failed:', error);
    } finally {
        await page.waitForTimeout(3000);
        await browser.close();
    }
})();