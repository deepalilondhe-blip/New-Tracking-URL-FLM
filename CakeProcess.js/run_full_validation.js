const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '..', '.env') });

const LEAD_ID = 'D66D77F5';
const SCREENSHOT_DIR = path.join(__dirname, 'lead_validation_screenshots');
const DASHBOARD_DIR = path.join(__dirname, '..', 'FML_Project_Dashboard');

[SCREENSHOT_DIR, DASHBOARD_DIR].forEach(dir => {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
});

(async () => {
  const browser = await chromium.launch({ headless: false });
  const page = await browser.newPage();
  
  try {
    console.log('\n' + '='.repeat(70));
    console.log('🔐 STEP 1: LOGIN TO CAKE');
    console.log('='.repeat(70));
    
    await page.goto('https://app.forwardleapmarketing.com/?lm_id=sessionexpired', { waitUntil: 'networkidle', timeout: 30000 });
    await page.waitForTimeout(2000);
    
    // Fill login form
    const emailField = await page.$('input[type="email"], input[name*="email"]');
    if (emailField) {
      await emailField.fill('urvish.patel@bytestechnolab.com');
      console.log('✅ Email entered');
    }
    
    const passField = await page.$('input[type="password"]');
    if (passField) {
      await passField.fill('Urvish@123#2026-05');
      console.log('✅ Password entered');
    }
    
    const loginBtn = await page.$('button[type="submit"], button:has-text("Login")');
    if (loginBtn) {
      await loginBtn.click();
      console.log('✅ Login clicked');
      try {
        await page.waitForNavigation({ waitUntil: 'networkidle', timeout: 20000 });
      } catch (e) {
        await page.waitForTimeout(3000);
      }
    }
    
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, '00_logged_in.png') });
    console.log('📸 Login screenshot saved');
    
    console.log('\n' + '='.repeat(70));
    console.log('🚀 STEP 2: SEARCH LEAD ID: ' + LEAD_ID);
    console.log('='.repeat(70));
    
    const inputs = await page.locator('input').all();
    console.log(`Found ${inputs.length} input fields`);
    
    if (inputs.length > 1) {
      await inputs[1].fill(LEAD_ID);
      console.log('✅ Lead ID pasted');
      await inputs[1].press('Enter');
      console.log('✅ Search executed');
      await page.waitForTimeout(3000);
    }
    
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, '01_search_results.png') });
    console.log('📸 Search results screenshot');
    
    console.log('\n' + '='.repeat(70));
    console.log('📌 STEP 3: OPENING LEAD POPUP');
    console.log('='.repeat(70));
    
    // Find and click Lead ID link
    const links = await page.locator('a').all();
    for (const link of links) {
      const text = await link.textContent().catch(() => '');
      if (text.includes(LEAD_ID)) {
        await link.click();
        console.log('✅ Lead popup clicked');
        await page.waitForTimeout(2000);
        break;
      }
    }
    
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, '02_popup_opened.png') });
    console.log('📸 Popup screenshot');
    
    console.log('\n' + '='.repeat(70));
    console.log('✅ CHECKING IS TEST CHECKBOX');
    console.log('='.repeat(70));
    
    const checkbox = await page.$('input[type="checkbox"]');
    let isTestStatus = 'NOT FOUND';
    if (checkbox) {
      isTestStatus = await checkbox.isChecked() ? 'CHECKED ✓' : 'UNCHECKED ✗';
      console.log('IS Test: ' + isTestStatus);
    }
    
    console.log('\n' + '='.repeat(70));
    console.log('📑 STEP 4: VALIDATING ALL TABS');
    console.log('='.repeat(70));
    
    const tabs = await page.locator('[role="tab"], .tab, button[class*="tab"]').allTextContents();
    const tabsData = {};
    
    for (const tab of tabs) {
      if (tab.trim()) {
        await page.locator(`button:has-text("${tab}"), [role="tab"]:has-text("${tab}")`).first().click().catch(() => {});
        await page.waitForTimeout(800);
        
        const fields = await page.locator('input, select, textarea').all();
        let blanks = 0;
        for (const field of fields) {
          const val = await field.inputValue().catch(() => '');
          if (!val || val.trim() === '') blanks++;
        }
        
        tabsData[tab.trim()] = {
          fields: fields.length,
          blanks: blanks,
          status: blanks === 0 ? 'PASS ✓' : 'FAIL - ' + blanks + ' blank'
        };
        console.log(`  ${tab.trim()}: ${fields.length} fields, ${blanks} blank → ${tabsData[tab.trim()].status}`);
      }
    }
    
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, '03_tabs_validated.png') });
    console.log('\n📸 Tabs validation screenshot');
    
    console.log('\n' + '='.repeat(70));
    console.log('📊 STEP 5: CREATING DASHBOARD CSV');
    console.log('='.repeat(70));
    
    const now = new Date();
    const month = now.toLocaleString('default', { month: 'long' });
    const year = now.getFullYear();
    const monthFolder = path.join(DASHBOARD_DIR, `${month}_${year}`);
    const sheetFile = path.join(monthFolder, `Sheet_${now.getMonth() + 1}_${year}.csv`);
    
    if (!fs.existsSync(monthFolder)) {
      fs.mkdirSync(monthFolder, { recursive: true });
    }
    
    const headers = 'Timestamp,URL,Lead ID,IS Test,Tab Validation,Overall Status';
    const tabValid = Object.values(tabsData).every(t => t.blanks === 0) ? 'PASS' : 'FAIL';
    const data = `${now.toISOString()},https://app.forwardleapmarketing.com/,${LEAD_ID},${isTestStatus},${Object.keys(tabsData).length} tabs validated,${tabValid}`;
    
    let csvContent = '';
    if (!fs.existsSync(sheetFile)) {
      csvContent = headers + '\n' + data;
      console.log('✅ Created new sheet: ' + path.basename(sheetFile));
    } else {
      csvContent = data;
      console.log('✅ Appending to sheet: ' + path.basename(sheetFile));
    }
    
    fs.appendFileSync(sheetFile, csvContent + '\n');
    console.log('✅ Dashboard updated: ' + monthFolder);
    
    console.log('\n' + '='.repeat(70));
    console.log('✅ CAKE VALIDATION COMPLETE');
    console.log('='.repeat(70));
    console.log('Lead ID: ' + LEAD_ID);
    console.log('IS Test: ' + isTestStatus);
    console.log('Tabs Checked: ' + Object.keys(tabsData).length);
    console.log('Dashboard: CREATED');
    
    console.log('\n' + '='.repeat(70));
    console.log('🔐 STEP 6: OPENING CDB SYSTEM');
    console.log('='.repeat(70));
    
    await page.goto('https://www.flmreporting.com/flm_central_leads/auth/login.php', { waitUntil: 'networkidle', timeout: 30000 });
    await page.waitForTimeout(2000);
    console.log('✅ CDB login page opened');
    
    // CDB Login
    const cdbEmail = await page.$('input[type="email"], input[name*="email"]');
    if (cdbEmail) {
      await cdbEmail.fill('nirav.dobariya@bytestechnolab.com');
      console.log('✅ CDB Email entered');
    }
    
    const cdbPass = await page.$('input[type="password"]');
    if (cdbPass) {
      await cdbPass.fill('Nirav@1234');
      console.log('✅ CDB Password entered');
    }
    
    const cdbLogin = await page.$('button[type="submit"], button:has-text("Login")');
    if (cdbLogin) {
      await cdbLogin.click();
      console.log('✅ CDB Login clicked');
      try {
        await page.waitForNavigation({ waitUntil: 'networkidle', timeout: 20000 });
      } catch (e) {
        await page.waitForTimeout(3000);
      }
    }
    
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, '04_cdb_logged_in.png') });
    console.log('📸 CDB login screenshot');
    
    console.log('\n' + '='.repeat(70));
    console.log('📋 STEP 7: OPENING LEAD LISTING TAB');
    console.log('='.repeat(70));
    
    const leadListTab = await page.locator('a:has-text("Lead Listing"), button:has-text("Lead Listing")').first();
    if (await leadListTab.isVisible({ timeout: 3000 }).catch(() => false)) {
      await leadListTab.click();
      console.log('✅ Lead Listing tab opened');
      await page.waitForTimeout(2000);
    }
    
    console.log('\n' + '='.repeat(70));
    console.log('🔍 STEP 8: SEARCHING LEAD ID IN CDB');
    console.log('='.repeat(70));
    
    const searchInputs = await page.locator('input[type="search"], input[placeholder*="Search"]').all();
    console.log(`Found ${searchInputs.length} search boxes`);
    
    if (searchInputs.length >= 3) {
      console.log('ℹ️  Using 3rd search box as specified');
      await searchInputs[2].fill(LEAD_ID);
      console.log('✅ Lead ID pasted in CDB');
      await searchInputs[2].press('Enter');
      console.log('✅ CDB search executed');
      await page.waitForTimeout(2000);
    } else if (searchInputs.length > 0) {
      console.log('ℹ️  Using available search box');
      await searchInputs[searchInputs.length - 1].fill(LEAD_ID);
      await searchInputs[searchInputs.length - 1].press('Enter');
      await page.waitForTimeout(2000);
    }
    
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, '05_cdb_search_results.png') });
    console.log('📸 CDB search results screenshot');
    
    console.log('\n' + '='.repeat(70));
    console.log('✅ CHECKING CDB RESULT');
    console.log('='.repeat(70));
    
    const pageText = await page.textContent();
    const cdbFound = pageText.includes(LEAD_ID) ? 'FOUND ✓' : 'NOT FOUND ✗';
    console.log('CDB Status: ' + cdbFound);
    
    // Update dashboard with CDB status
    const dashboardLine = `${now.toISOString()},https://www.flmreporting.com,${LEAD_ID},${isTestStatus},${Object.keys(tabsData).length} tabs,${cdbFound}`;
    fs.appendFileSync(sheetFile, dashboardLine + '\n');
    
    console.log('\n' + '='.repeat(70));
    console.log('✅ COMPLETE VALIDATION FINISHED');
    console.log('='.repeat(70));
    console.log('Lead ID: ' + LEAD_ID);
    console.log('Cake Validation: COMPLETED');
    console.log('CDB Status: ' + cdbFound);
    console.log('Dashboard: UPDATED');
    console.log('\n⏳ Browser staying open 60 seconds for review...\n');
    
  } catch (error) {
    console.log('❌ Error: ' + error.message);
  }
  
  await page.waitForTimeout(60000);
  await browser.close();
})();
