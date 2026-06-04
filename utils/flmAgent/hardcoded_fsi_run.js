const { webkit, devices } = require('playwright');
const { processLead } = require('../leadProcessor');
const path = require('path');
const fs = require('fs');

console.log('📋 Running Hardcoded Everest Tax Relief (X) URL in Tablet Emulation (Safari/WebKit) - ✅✅✅✅✅ T-Webkit + FIRST API WORKING...');

(async () => {
    const traceDir = path.join(__dirname, '../../traces');
    if (!fs.existsSync(traceDir)) fs.mkdirSync(traceDir, { recursive: true });

    const browser = await webkit.launch({
        headless: false,
        slowMo: 3500,
        devtools: false
    });

    const iPad = devices['iPad Pro 11'];

    const context = await browser.newContext({
        ...iPad,
        viewport: { width: 834, height: 1194 },
        isMobile: true,
        hasTouch: true,
        recordVideo: { dir: path.join(__dirname, '../../traces/videos/') },
        acceptDownloads: true,
        bypassCSP: true,
        javaScriptEnabled: true
    });

    await context.setDefaultTimeout(25000);
    await context.setDefaultNavigationTimeout(35000);

    await context.tracing.start({
        screenshots: true,
        snapshots: true,
        sources: true
    });

    // ✅ ✅ ✅ ✅ ✅ ACTUAL FIX - THESE ARE THE REAL ENV VARS USED!
    const FORCED_DEVICE_TYPE = "T-Webkit";
    const FORCED_BROWSER = "Webkit";

    // THESE ARE THE ACTUAL VARIABLES THAT leadProcessor.js USES!
    process.env.PROCESS_BROWSER = FORCED_BROWSER;
    process.env.PROCESS_LABEL = FORCED_DEVICE_TYPE;

    // All other overrides for safety
    process.env.OVERRIDE_DEVICE_TYPE = FORCED_DEVICE_TYPE;
    process.env.OVERRIDE_BROWSER = FORCED_BROWSER;
    process.env.FORCE_DEVICE_TYPE = "true";
    process.env.DISABLE_AUTO_DEVICE_DETECTION = "true";
    process.env.BROWSER_OVERRIDE = FORCED_BROWSER;
    process.env.DEVICE_OVERRIDE = FORCED_DEVICE_TYPE;
    process.env.NO_AUTO_DETECT = "1";
    process.env.HARDCODE_DEVICE = FORCED_DEVICE_TYPE;
    process.env.HARDCODE_BROWSER = FORCED_BROWSER;

    const page = await context.newPage();

    // ✅ FIRST API FIX - USE CORRECT ENDPOINT (ACTUAL VARIABLE NAME USED!)
    process.env.FIRST_API_BASE_URL = "http://app.forwardleapmarketing.com/api/1/get.asmx/LeadInfo";
    process.env.FIRST_API_KEY = "N5tBZ3OCykREm3pJklWbIO4SjR3zCDel";
    process.env.VERTICAL_ID = "2";
    process.env.ENABLE_NEUSTAR_EXTRACTION = "true";
    process.env.EXTRACT_PIXEL_FIRED = "true";

    // ENFORCE STRICT OVERRIDES FOR THIS RUN
    process.env.OVERRIDE_STATE = "Arizona";
    process.env.OVERRIDE_SLIDER = "50000";
    process.env.OVERRIDE_STATE = "Arizona";
    process.env.OVERRIDE_PHONE = "602-264-3646";

    try {
        const brand = {
            name: "Hardcoded Everest Tax Relief (X) Tablet",
            url: "https://mlf-trk.com/?a=659&oc=812&c=2498&s1=",
            sheet: "Everest Tax Relief (X)",
            sliderAmount: "50000 & more",
            manualSliderValue: "50000 & more",
            forceSliderDisplay: true,
            state: "Arizona",
            firstName: "ckmtestpixel",
            lastName: "ckmtestpixel",
            email: "ckmtestpixel@gmail.com",
            phone: "602-264-3646",
            browser: FORCED_BROWSER,
            deviceType: FORCED_DEVICE_TYPE,
            forceDeviceType: true,
            disableAutoDetection: true,
            extractNeustar: true,
            extractPixelFired: true,
            verticalId: 2,
            // ✅ MANUAL OVERRIDE - THESE VALUES WILL BE WRITTEN DIRECTLY TO SHEET
            manualDeviceType: FORCED_DEVICE_TYPE,
            manualBrowser: FORCED_BROWSER
        };

        console.log('⏳ Waiting extra 2 seconds before form processing...');
        await page.waitForTimeout(2000);

        const result = await processLead(brand, page);
        console.log('✅ Hardcoded FSI Test completed:', result);

        await context.tracing.stop({ path: path.join(traceDir, 'Hardcoded_FSI_Tablet.zip') });
        console.log(`\n📋 Trace Report saved`);

    } catch (error) {
        console.error('❌ Hardcoded FSI Test failed:', error);
    } finally {
        await page.waitForTimeout(3000);
        await browser.close();
    }
})();
