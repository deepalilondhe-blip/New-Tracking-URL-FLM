const { chromium } = require('playwright');
const FormPage = require('./pages/FormPage');
const { processLead } = require('./utils/leadProcessor');
const path = require('path');
const fs = require('fs');

console.log('✅ Running 1800 Fresh Tax (CPC) with Video & Trace Recording...');
console.log('✅ Tracking URL: https://mlf-1800-trk.com/?a=659&oc=806&c=2464&s1=');
console.log('✅ Sheet Name: 1800 Fresh Tax (CPC)');

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
            name: "1800 Fresh Tax (CPC)",
            url: "https://mlf-1800-trk.com/?a=659&oc=806&c=2464&s1=",
            sheet: "1800 Fresh Tax (CPC)",
            sliderAmount: "12000",
            state: "Maine",
            firstName: "ckmtestpixel",
            lastName: "ckmtestpixel",
            email: "ckmtestpixel@gmail.com",
            phone: "207-234-3082"
        };

        const result = await processLead(brand, page);
        console.log('✅ 1800 Fresh Tax (CPC) Test completed:', result);

        await context.tracing.stop({ path: path.join(traceDir, '1800_Fresh_Tax_CPC_Desktop.zip') });
        console.log(`\n📋 Trace Report saved to: traces/1800_Fresh_Tax_CPC_Desktop.zip`);

    } catch (error) {
        console.error('❌ 1800 Fresh Tax (CPC) Test failed:', error);
    } finally {
        await page.waitForTimeout(3000);
        await browser.close();
    }
})();