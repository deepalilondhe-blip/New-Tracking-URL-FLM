const { chromium } = require('playwright');
const FormPage = require('./pages/FormPage');
const { processLead } = require('./utils/leadProcessor');
const path = require('path');
const fs = require('fs');

console.log('✅ Running Guardian Tax Relief (PPC) with Video & Trace Recording...');
console.log('✅ Tracking URL: https://mlf-gt.com/?a=659&oc=816&c=2521&s1=');
console.log('✅ Sheet Name: Guardian Tax Relief (PPC)');
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
            name: "Guardian Tax Relief (PPC)",
            url: "https://mlf-gt.com/?a=659&oc=816&c=2521&s1=",
            sheet: "Guardian Tax Relief (PPC)",
            sliderAmount: "12000",
            state: "Maine",
            firstName: "ckmtestpixel",
            lastName: "ckmtestpixel",
            email: "ckmtestpixel@gmail.com",
            phone: "207-234-3082",
            createNewSheetTab: true
        };

        const result = await processLead(brand, page);
        console.log('✅ Guardian Tax Relief (PPC) Test completed:', result);

        await context.tracing.stop({ path: path.join(traceDir, 'Guardian_Tax_Relief_PPC_Desktop.zip') });
        console.log(`\n📋 Trace Report saved to: traces/Guardian_Tax_Relief_PPC_Desktop.zip`);

    } catch (error) {
        console.error('❌ Guardian Tax Relief (PPC) Test failed:', error);
    } finally {
        await page.waitForTimeout(3000);
        await browser.close();
    }
})();