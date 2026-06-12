const { firefox } = require('playwright');
const { processLead } = require('./utils/leadProcessor');
const path = require('path');
const fs = require('fs');

// Set exact overrides for the runner
process.env.OVERRIDE_SLIDER = "12000";
process.env.OVERRIDE_STATE = "Colorado";
process.env.OVERRIDE_PHONE = "970-321-4664";
process.env.PROCESS_BROWSER = "firefox";
process.env.PROCESS_LABEL = "W-Firefox";

console.log('✅ Running Guardian Tax Relief (PPC) with Video & Trace Recording...');
console.log('✅ Tracking URL: https://mlf-gt.com/?a=659&oc=816&c=2521&s1=');
console.log('✅ Sheet Name: Guardian Tax Relief (PPC)');
console.log('✅ Mode: HEADED (Browser visible)');
console.log('✅ Test Data: First Name: ckmtestpixel, Last Name: ckmtestpixel, Email: ckmtestpixel@gmail.com');

(async () => {
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
            id: "guardian-tax-relief-ppc",
            name: "Guardian Tax Relief (PPC)",
            url: "https://mlf-gt.com/?a=659&oc=816&c=2521&s1=",
            sheet: "Guardian Tax Relief (PPC)",
            sliderAmount: "12000",
            state: "Colorado",
            firstName: "ckmtestpixel",
            lastName: "ckmtestpixel",
            email: "ckmtestpixel@gmail.com",
            phone: "970-321-4664",
            disableRotation: true,
            forceExactValues: true,
            forceExactPhone: true,
            forceExactState: true,
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