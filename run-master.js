/**
 * ====================================================================
 * 🚀 UNIFIED MASTER RUNNER SCRIPT (run-master.js)
 * ====================================================================
 * Automatically emulates Desktop, Tablet, or Mobile (iPhone 17 Pro) viewports
 * dynamically from a centralized configuration database.
 * 
 * Usage:
 *   node run-master.js --campaign <id> --viewport <desktop|tablet|mobile|api>
 */
const { chromium, firefox, webkit } = require('playwright-extra');
const stealth = require('puppeteer-extra-plugin-stealth')();
chromium.use(stealth);
firefox.use(stealth);
const { devices } = require('playwright');
const { processLead } = require('./utils/leadProcessor');
const path = require('path');
const fs = require('fs');

// Register global error handlers to ensure clean teardown behavior under all engines
process.on('unhandledRejection', (reason) => {
  const msg = reason && reason.message ? reason.message : String(reason);
  if (msg.includes('closed') || msg.includes('tracing') || msg.includes('target')) {
    process.exit(0);
  }
  console.error('Unhandled Rejection:', reason);
});

process.on('uncaughtException', (err) => {
  const msg = err && err.message ? err.message : String(err);
  if (msg.includes('closed') || msg.includes('tracing') || msg.includes('target')) {
    process.exit(0);
  }
  console.error('Uncaught Exception:', err);
  process.exit(1);
});

// Parse process arguments
const args = process.argv.slice(2);
const campaignIdArg = getArgValue(args, '--campaign');
const viewportArg = (getArgValue(args, '--viewport') || 'desktop').toLowerCase();

if (!campaignIdArg) {
  console.error('❌ Error: Missing --campaign argument. Example: node run-master.js --campaign ftd-x');
  process.exit(1);
}

function getArgValue(args, key) {
  const index = args.indexOf(key);
  return (index !== -1 && args[index + 1]) ? args[index + 1] : null;
}

// Load centralized campaigns JSON configuration database
const configPath = path.join(__dirname, 'config', 'campaigns.json');
if (!fs.existsSync(configPath)) {
  console.error(`❌ Error: Centralized configuration file not found at: ${configPath}`);
  process.exit(1);
}

let campaigns = [];
try {
  campaigns = JSON.parse(fs.readFileSync(configPath, 'utf8'));
} catch (e) {
  console.error('❌ Error: Could not parse central campaigns.json configuration:', e.message);
  process.exit(1);
}

const campaignConfig = campaigns.find(c => c.id === campaignIdArg);
if (!campaignConfig) {
  console.error(`❌ Error: Campaign ID "${campaignIdArg}" not found in config/campaigns.json`);
  process.exit(1);
}

console.log(`\n🤖 ================================================================`);
console.log(`🤖 MASTER RUNNER: LAUNCHING ${campaignConfig.name.toUpperCase()}`);
console.log(`🤖 Mode:            ${viewportArg.toUpperCase()}`);
console.log(`🤖 Tracking URL:     ${campaignConfig.url}`);
console.log(`🤖 Target Sheet:    ${campaignConfig.sheet}`);
console.log(`🤖 ================================================================`);

// Execute Direct Headless HTTP API Process
if (viewportArg === 'api') {
  const { request } = require('playwright');
  const { processLeadApi } = require('./utils/leadProcessor');
  
  (async () => {
    console.log('📡 Initializing direct HTTP automation context (NO BROWSER)...');
    const apiContext = await request.newContext({
      extraHTTPHeaders: {
        'User-Agent': 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1',
        'Accept': 'application/json, text/plain, */*',
        'Content-Type': 'application/x-www-form-urlencoded',
        'Referer': 'https://flmtra.com/'
      }
    });

    try {
      const brand = {
        name: campaignConfig.name,
        url: campaignConfig.url,
        sheet: campaignConfig.sheet,
        sliderAmount: campaignConfig.sliderAmount,
        state: campaignConfig.state,
        phone: campaignConfig.phone
      };

      console.log('📡 Dispatching direct API POST request payload...');
      const result = await processLeadApi(brand, apiContext);
      
      console.log('\n✅ Direct API Automation Completed Successfully!');
      console.log('📋 Response Object:', JSON.stringify(result, null, 2));
      process.exit(0);
    } catch (error) {
      console.error('\n❌ Direct API Automation Failed:', error.message);
      process.exit(1);
    } finally {
      await apiContext.dispose();
    }
  })();
} else {
  // Execute Visual Browser-Driven Process
  (async () => {
    const traceDir = path.join(__dirname, 'traces');
    if (!fs.existsSync(traceDir)) fs.mkdirSync(traceDir);

    const isHeadedArg = process.argv.includes('--headed');
    const isHeadlessArg = process.argv.includes('--headless');
    
    // Priority: 1. Manual Flags, 2. Environment Variable (from Dashboard), 3. Default (Headless)
    let isHeadless = true;
    if (isHeadedArg || process.env.HEADLESS === 'false') isHeadless = false;
    else if (isHeadlessArg || process.env.HEADLESS === 'true') isHeadless = true;

    const browserType = process.env.PROCESS_BROWSER || 'chromium';
    const browserEngine = require('playwright-extra')[browserType];
    
    if (!browserEngine) {
      console.error(`❌ Invalid browser engine: ${browserType}`);
      process.exit(1);
    }

    const browser = await browserEngine.launch({
      headless: isHeadless,
      slowMo: isHeadless ? 0 : 2000
    });

    let contextOptions = {
      recordVideo: { dir: 'traces/videos/' }
    };

    // Dynamically apply device emulation and viewports based on the matrix label
    const label = process.env.PROCESS_LABEL || 'Standard';
    
    if (viewportArg === 'tablet') {
      const iPad = devices['iPad Pro 11'];
      contextOptions = {
        ...contextOptions,
        ...iPad,
        viewport: { width: 834, height: 1194 },
        deviceScaleFactor: 2,
        acceptDownloads: true,
        bypassCSP: true,
        javaScriptEnabled: true
      };
      console.log(`📋 Emulated Device Profile: TABLET (iPad Pro 11) - [${label}]`);
    } else if (viewportArg === 'mobile') {
      if (label.includes('Android')) {
        const android = devices['Pixel 7'];
        contextOptions = {
          ...contextOptions,
          ...android,
          acceptDownloads: true,
          bypassCSP: true,
          javaScriptEnabled: true
        };
        console.log(`📋 Emulated Device Profile: MOBILE (Pixel 7) - [${label}]`);
      } else {
        const iPhone = devices['iPhone 15 Pro Max'];
        const iPhone17Pro = {
          ...iPhone,
          viewport: { width: 430, height: 932 },
          deviceScaleFactor: 3,
          userAgent: iPhone.userAgent.replace('iPhone OS 17_0', 'iPhone OS 18_0')
        };
        contextOptions = {
          ...contextOptions,
          ...iPhone17Pro,
          acceptDownloads: true,
          bypassCSP: true,
          javaScriptEnabled: true
        };
        console.log(`📋 Emulated Device Profile: MOBILE (iPhone 17 Pro Mode) - [${label}]`);
      }
    } else {
      contextOptions.viewport = { width: 1280, height: 800 };
      console.log(`💻 Emulated Device Profile: DESKTOP - [${label}]`);
    }

    const context = await browser.newContext(contextOptions);
    await context.setDefaultTimeout(25000);
    await context.setDefaultNavigationTimeout(35000);

    // Initialize tracing
    await context.tracing.start({ screenshots: true, snapshots: true, sources: true });
    const page = await context.newPage();
    let brand = null;

    try {
      // Build dynamic brand configuration for lead processor
      let brandSuffix = '';
      if (viewportArg === 'tablet') brandSuffix = ' Tablet';
      if (viewportArg === 'mobile') brandSuffix = ' Mobile';

      brand = {
        ...campaignConfig,
        id: campaignConfig.id,
        name: `${campaignConfig.name}${brandSuffix}`,
        url: campaignConfig.url,
        sheet: campaignConfig.sheet,
        sliderAmount: campaignConfig.sliderAmount,
        state: campaignConfig.state,
        phone: campaignConfig.phone,
        skipSecondApi: campaignConfig.skipSecondApi || false
      };

      if (viewportArg !== 'desktop') {
        console.log('⏳ Delaying 200ms to allow responsive layouts to mount...');
        await page.waitForTimeout(200);
      }

      const result = await processLead(brand, page);
      if (!result.success) {
        const err = new Error(result.error || 'Execution failed during processLead');
        err.leadId = result.leadId;
        throw err;
      }
      console.log(`\n✅ Execution successfully processed!`, result);
      console.log(JSON.stringify(result));

      // Stop tracing and save ZIP report
      const tracePath = path.join(traceDir, `${campaignConfig.id}_${viewportArg}.zip`);
      await context.tracing.stop({ path: tracePath });
      console.log(`📋 Trace report successfully saved: traces/${campaignConfig.id}_${viewportArg}.zip`);

    } catch (error) {
      console.error(`❌ Automation Run encountered a fatal exception:`, error.message);
      
      // Capture failure screenshot for Auto-Evidence emailing
      const failScreenshot = path.join(traceDir, `FAILURE_${campaignConfig.id}_${viewportArg}.png`);
      try {
        await page.screenshot({ path: failScreenshot });
        console.log(`📸 Failure screenshot saved: ${failScreenshot}`);
      } catch (err) {}

      // Return paths so scheduler can email them
      const videoPath = await page.video()?.path();
      console.log(JSON.stringify({
        success: false,
        error: error.message,
        leadId: error.leadId || null,
        brand: brand,
        screenshot: failScreenshot,
        video: videoPath
      }));
      process.exitCode = 1;
    } finally {
      await page.waitForTimeout(3000);
      await browser.close().catch(() => null);
    }
  })();
}
