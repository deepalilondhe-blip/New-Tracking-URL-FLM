const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '..', '.env') });

const LEAD_ID = 'D66D77F5';
const SCREENSHOT_DIR = path.join(__dirname, 'lead_validation_screenshots');
const DASHBOARD_DIR = path.join(__dirname, '..', 'FML_Project_Dashboard');

if (!fs.existsSync(SCREENSHOT_DIR)) fs.mkdirSync(SCREENSHOT_DIR, { recursive: true });
if (!fs.existsSync(DASHBOARD_DIR)) fs.mkdirSync(DASHBOARD_DIR, { recursive: true });

(async () => {
  const browser = await chromium.launch({ headless: false });
  const page = await browser.newPage();
  
  try {
    console.log('\n' + '='.repeat(70));
    console.log('🚀 STEP 1: OPENING CAKE HOMEPAGE');
    console.log('='.repeat(70));
    await page.goto('https://app.forwardleapmarketing.com/', { waitUntil: 'networkidle', timeout: 30000 });
    await page.waitForTimeout(3000);
    console.log('✅ Cake homepage loaded');
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, '01_cake_homepage.png') });
    console.log('📸 Screenshot saved');
    
    console.log('\n' + '='.repeat(70));
    console.log('🔍 STEP 2: SEARCHING LEAD ID: ' + LEAD_ID);
    console.log('='.repeat(70));
    
    const inputs = await page.locator('input').all();
    console.log(`Found ${inputs.length} input fields on page`);
    
    // Try 2nd input (usually the search field)
    if (inputs.length > 1) {
      await inputs[1].fill(LEAD_ID);
      console.log('✅ Lead ID pasted in search box');
      await inputs[1].press('Enter');
      console.log('✅ Search executed');
      await page.waitForTimeout(3000);
    }
    
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, '02_search_results.png') });
    console.log('📸 Search results screenshot saved');
    
    console.log('\n' + '='.repeat(70));
    console.log('✅ STEPS 1-2 COMPLETE');
    console.log('='.repeat(70));
    console.log('\n📌 Next: Open Lead popup → Check tabs → Create Dashboard');
    console.log('⏳ Browser will stay open for 120 seconds for manual inspection...\n');
    
  } catch (error) {
    console.log('❌ Error: ' + error.message);
  }
  
  await page.waitForTimeout(120000);
  await browser.close();
})();
