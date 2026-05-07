const { chromium } = require('playwright');
const FormPage = require('./pages/FormPage');
const { processLead } = require('./utils/leadProcessor');
const path = require('path');
const fs = require('fs');

console.log('✅ Running PPC-ST with Video & Trace Recording...');

(async () => {
  // Create traces directory if it doesn't exist
  const traceDir = path.join(__dirname, 'traces');
  if (!fs.existsSync(traceDir)) fs.mkdirSync(traceDir);

  const browser = await chromium.launch({ headless: false, slowMo: 800 });
  
  // Create a context with video recording enabled
  const context = await browser.newContext({
    recordVideo: { dir: 'traces/videos/' }
  });

  // Start tracing to capture screenshots and DOM snapshots
  await context.tracing.start({ screenshots: true, snapshots: true, sources: true });

  const page = await context.newPage();

  try {
    const brand = {
      name: "PPC-ST",
      url: "https://flmtra.com/?a=659&oc=837&c=2210&s1=",
      sheet: "PPC-ST",
      sliderAmount: "18,000",
      state: "OR",
      phone: "503-518-1606"
    };

    const result = await processLead(brand, page);
    console.log('✅ Test completed:', result);

    // Stop tracing and save the ZIP file
    await context.tracing.stop({ path: path.join(traceDir, 'PPC-ST.zip') });
    console.log(`\n📂 Trace Report saved to: traces/PPC-ST.zip`);
    console.log(`💡 To view report, run: npx playwright show-trace traces/PPC-ST.zip`);

  } catch (error) {
    console.error('❌ Test failed:', error);
  } finally {
    await page.waitForTimeout(3000);
    await browser.close();
  }
})();
