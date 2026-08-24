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
const axios = require('axios');

// saved proxies to use IP rotation
async function getWorkingUsProxy() {
  global.isProxyTesting = true;
  console.log('📡 Fetching USA SOCKS5 proxy pool from ProxyScrape...');
  try {
    const response = await axios.get('https://api.proxyscrape.com/v4/free-proxy-list/get?request=display_proxies&proxy_format=ipport&format=json&country=us&protocol=socks5', { timeout: 8000 });
    const proxies = response.data.proxies || [];
    console.log(`📡 Pool size: ${proxies.length} proxies. Testing for responsiveness...`);
    
    // Test the top 15 proxies
    for (let i = 0; i < Math.min(proxies.length, 15); i++) {
      const p = proxies[i];
      const proxyUrl = `socks5://${p.ip}:${p.port}`;
      console.log(`🔌 Testing proxy ${i+1}/${Math.min(proxies.length, 15)}: ${proxyUrl}`);
      
      let testBrowser;
      try {
        testBrowser = await chromium.launch({
          proxy: { server: proxyUrl }
        });
        const context = await testBrowser.newContext();
        const page = await context.newPage();
        
        await page.goto('https://ipinfo.io/json', { timeout: 10000 });
        const text = await page.locator('pre').innerText();
        const details = JSON.parse(text);
        
        if (details && details.country === 'US') {
          console.log(`✅ Proxy verified! Country: ${details.country}, City: ${details.city}, IP: ${details.ip}`);
          await testBrowser.close().catch(() => {});
          global.isProxyTesting = false;
          return proxyUrl;
        }
      } catch (err) {
        // Silent fail for next proxy
      } finally {
        if (testBrowser) {
          await testBrowser.close().catch(() => {});
        }
      }
    }
  } catch (err) {
    console.error('⚠️ ProxyScrape fetch failed:', err.message);
  } finally {
    global.isProxyTesting = false;
  }
  return null;
}

// Register global error handlers to ensure clean teardown behavior under all engines
process.on('unhandledRejection', (reason) => {
  if (global.isProxyTesting) return;
  const msg = reason && reason.message ? reason.message : String(reason);
  if (msg.includes('closed') || msg.includes('tracing') || msg.includes('target')) {
    process.exit(0);
  }
  console.error('Unhandled Rejection:', reason);
});

process.on('uncaughtException', (err) => {
  if (global.isProxyTesting) return;
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

if (viewportArg === 'mac-firefox') {
  process.env.PROCESS_BROWSER = 'firefox';
  process.env.PROCESS_LABEL = 'Mac - Firefox';
}

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
      // Implement strict randomization for every execution
      let dynamicSliderAmount = campaignConfig.sliderAmount;
      if (campaignConfig.sliderOptions && Array.isArray(campaignConfig.sliderOptions)) {
        const randomIndex = Math.floor(Math.random() * campaignConfig.sliderOptions.length);
        dynamicSliderAmount = campaignConfig.sliderOptions[randomIndex];
        console.log(`🎲 [Randomizer] Selected random dropdown option: "${dynamicSliderAmount}"`);
      } else {
        let maxLimit = 100000;
        if (campaignConfig.sliderAmount) {
          const parsed = parseInt(campaignConfig.sliderAmount.toString().replace(/[^0-9]/g, ''));
          if (!isNaN(parsed) && parsed > 0) maxLimit = parsed;
        }
        let randomNum;
        if (maxLimit < 10000) {
          randomNum = maxLimit;
        } else {
          const maxSteps = Math.floor(maxLimit / 10000);
          const steps = Math.floor(Math.random() * maxSteps + 1);
          randomNum = steps * 10000;
        }
        dynamicSliderAmount = randomNum.toString();
        console.log(`🎲 [Randomizer] Generated random numeric slider value: ${dynamicSliderAmount} (capped at configured max ${maxLimit})`);
      }

      if (process.env.OVERRIDE_SLIDER) {
        dynamicSliderAmount = process.env.OVERRIDE_SLIDER;
        console.log(`🎲 [Randomizer] Overridden by manual script override: ${dynamicSliderAmount}`);
      }

      const brand = {
        name: campaignConfig.name,
        url: campaignConfig.url,
        sheet: campaignConfig.sheet,
        sliderAmount: dynamicSliderAmount,
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
    
    // Priority: 1. CI/GitHub Actions always headless, 2. Manual flags, 3. Environment, 4. Default (Headless)
    let isHeadless = true;
    const isCi = process.env.CI === 'true' || process.env.GITHUB_ACTIONS === 'true';
    if (isCi) isHeadless = true;
    else if (isHeadedArg || process.env.HEADLESS === 'false') isHeadless = false;
    else if (isHeadlessArg || process.env.HEADLESS === 'true') isHeadless = true;

    const browserType = process.env.PROCESS_BROWSER || 'chromium';
    const browserEngine = require('playwright-extra')[browserType];
    
    if (!browserEngine) {
      console.error(`❌ Invalid browser engine: ${browserType}`);
      process.exit(1);
    }

    const useVpn = campaignConfig.useVpn === true;
    let browser = null;
    let context = null;

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

    let attempts = 0;
    const maxAttempts = 3;
    let success = false;
    let lastError = null;
    let brand = null;

    while (attempts < maxAttempts && !success) {
      attempts++;
      console.log(`\n🚀 Campaign Execution Attempt ${attempts}/${maxAttempts}...`);

      let proxyServer = null;
      let page = null;
      if (useVpn) {
        // Retrieve a fresh USA proxy for this attempt
        proxyServer = await getWorkingUsProxy();
        if (proxyServer) {
          contextOptions.proxy = {
            server: proxyServer
          };
          console.log(`🛡️  Routing browser traffic via US Proxy: ${proxyServer}`);
        } else {
          console.warn('⚠️ Could not find a working USA proxy. Proceeding with direct connection.');
        }
      }

      try {
        browser = await browserEngine.launch({
          headless: isHeadless,
          slowMo: isHeadless ? 0 : 2000
        });
        context = await browser.newContext(contextOptions);

        await context.setDefaultTimeout(25000);
        await context.setDefaultNavigationTimeout(35000);

        // Initialize tracing
        await context.tracing.start({ screenshots: true, snapshots: true, sources: true });
        page = await context.newPage();

        // Build dynamic brand configuration for lead processor
        let brandSuffix = '';
        if (viewportArg === 'tablet') brandSuffix = ' Tablet';
        if (viewportArg === 'mobile') brandSuffix = ' Mobile';

        // Implement strict randomization for every execution
        let dynamicSliderAmount = campaignConfig.sliderAmount;
        if (campaignConfig.sliderOptions && Array.isArray(campaignConfig.sliderOptions)) {
          const randomIndex = Math.floor(Math.random() * campaignConfig.sliderOptions.length);
          dynamicSliderAmount = campaignConfig.sliderOptions[randomIndex];
          console.log(`🎲 [Randomizer] Selected random dropdown option: "${dynamicSliderAmount}"`);
        } else {
          let maxLimit = 100000;
          if (campaignConfig.sliderAmount) {
            const parsed = parseInt(campaignConfig.sliderAmount.toString().replace(/[^0-9]/g, ''));
            if (!isNaN(parsed) && parsed > 0) maxLimit = parsed;
          }
          let randomNum;
          if (maxLimit < 10000) {
            randomNum = maxLimit;
          } else {
            const maxSteps = Math.floor(maxLimit / 10000);
            const steps = Math.floor(Math.random() * maxSteps + 1);
            randomNum = steps * 10000;
          }
          dynamicSliderAmount = randomNum.toString();
          console.log(`🎲 [Randomizer] Generated random numeric slider value: ${dynamicSliderAmount} (capped at configured max ${maxLimit})`);
        }

        if (process.env.OVERRIDE_SLIDER) {
          dynamicSliderAmount = process.env.OVERRIDE_SLIDER;
          console.log(`🎲 [Randomizer] Overridden by manual script override: ${dynamicSliderAmount}`);
        }

        brand = {
          ...campaignConfig,
          id: campaignConfig.id,
          name: `${campaignConfig.name}${brandSuffix}`,
          url: campaignConfig.url,
          sheet: campaignConfig.sheet,
          sliderAmount: dynamicSliderAmount,
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

        success = true; // Mark as successful to exit loop

      } catch (error) {
        console.error(`⚠️ Attempt ${attempts} encountered a fatal error:`, error.message);
        lastError = error;

        // Capture failure screenshot for this specific attempt
        const failScreenshot = path.join(traceDir, `FAILURE_${campaignConfig.id}_${viewportArg}_attempt_${attempts}.png`);
        try {
          const pages = context ? context.pages() : [];
          if (pages.length > 0) {
            await pages[0].screenshot({ path: failScreenshot });
            console.log(`📸 Failure screenshot saved for attempt ${attempts}: ${failScreenshot}`);
          }
        } catch (err) {}

      } finally {
        await page?.waitForTimeout(2000).catch(() => {});
        if (browser) {
          await browser.close().catch(() => null);
          browser = null;
          context = null;
        }
      }
    }

    if (!success) {
      console.error(`❌ All ${maxAttempts} attempts failed. Fatal exception:`, lastError.message);
      
      const failScreenshot = path.join(traceDir, `FAILURE_${campaignConfig.id}_${viewportArg}.png`);
      const lastAttemptScreenshot = path.join(traceDir, `FAILURE_${campaignConfig.id}_${viewportArg}_attempt_${attempts}.png`);
      if (fs.existsSync(lastAttemptScreenshot)) {
        try {
          fs.copyFileSync(lastAttemptScreenshot, failScreenshot);
        } catch (err) {}
      }

      console.log(JSON.stringify({
        success: false,
        error: lastError.message,
        leadId: lastError.leadId || null,
        brand: brand,
        screenshot: failScreenshot,
        video: null
      }));
      process.exitCode = 1;
    }
  })();
}
