const { firefox } = require('playwright');
const { processLead } = require('./utils/leadProcessor');
const path = require('path');
const fs = require('fs');

// Set exact overrides for the runner
process.env.OVERRIDE_SLIDER = "50000";
process.env.OVERRIDE_STATE = "Colorado";
process.env.OVERRIDE_PHONE = "303-446-1713";
process.env.PROCESS_BROWSER = "firefox";
process.env.PROCESS_LABEL = "W-Firefox";

console.log('✅ Running FTH Questionnaire Campaign with EXACT & DYNAMIC OVERRIDES...');
console.log('✅ Tracking URL: https://fthmlf-trk.com/?a=659&oc=786&c=2385&s1=');
console.log('✅ Sheet Name: FTH-quesstionnarie');
console.log('✅ Browser: Firefox');
console.log('✅ Device: Windows');
console.log('✅ Step 1: Audit (STRICT)');
console.log('✅ Step 2: 50000 & more (STRICT)');
console.log('✅ Step 4: Colorado (STRICT)');
console.log('✅ Other steps: SELECT RANDOM/ROTATIONAL');

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
            id: "fth-questionnaire",
            name: "FTH-quesstionnarie",
            url: "https://fthmlf-trk.com/?a=659&oc=786&c=2385&s1=",
            sheet: "FTH-quesstionnarie",
            sliderAmount: "50000",
            state: "Colorado",
            firstName: "ckmtestpixel",
            lastName: "ckmtestpixel",
            email: "ckmtestpixel@gmail.com",
            phone: "303-446-1713",
            disableRotation: true,
            forceExactValues: true,
            forceExactPhone: true,
            forceExactState: true,
            createNewSheetTab: true,
            stepOverrides: {
                "step1": "Audit",
                "step3": "> $50,000",
                "step10": "Colorado"

                


            }
        };

        const result = await processLead(brand, page);
        console.log('✅ FTH Test completed:', result);

        await context.tracing.stop({ path: path.join(traceDir, 'FTH_EXACT.zip') });
        console.log(`\n📋 Trace Report saved to: traces/FTH_EXACT.zip`);

    } catch (error) {
        console.error('❌ FTH Test failed:', error);
    } finally {
        await page.waitForTimeout(3000);
        await browser.close();
    }
})();
