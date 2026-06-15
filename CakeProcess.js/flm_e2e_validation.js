const { chromium } = require('playwright');
const path = require('path');
const utils = require('./cake_utils');
const googleSheetsUtils = require('../utils/googleSheetsUtils');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

const MASTER_SHEET_ID = '1fO1YFFIM-i_DRPLqdSqC4oECeAHEETPJmN6RWlTrLzU';
const TRK_SHEET_ID = '1rXIg3dMQ4APH3lHLcfWYfP45PnOAKmV9POkoSS3YWxI';
const AFTER_CAKE_TAB_NAME = 'After Cake Validation';

const CONFIG = {
  CAKE_URL: 'https://app.forwardleapmarketing.com',
  CAKE_LOGIN_URL: 'https://app.forwardleapmarketing.com/newaff.aspx',
  CAKE_USERNAME: 'urvish.patel@bytestechnolab.com',
  CAKE_PASSWORD: 'Urvish@123#2026-06',
  CDB_LOGIN_URL: 'https://www.flmreporting.com/flm_central_leads/auth/login.php',
  CDB_EMAIL: 'nirav.dobariya@bytestechnolab.com',
  CDB_PASSWORD: 'Nirav@1234'
};

async function verifyCakeTabs(page, leadId) {
  const result = {
    inCake: 'Not Found',
    tabs: {}
  };

  try {
    // Navigate to Login Page
    await page.goto(CONFIG.CAKE_LOGIN_URL, { waitUntil: 'networkidle' });

    // Wait for the login form to appear
    const emailInput = page.locator('input[name="username"], input[name="email"], input[type="text"], input[type="email"], #email').first();
    
    // Wait up to 10 seconds for the input to become visible
    try {
      await emailInput.waitFor({ state: 'visible', timeout: 10000 });
    } catch (e) {
      // Not visible after timeout
    }
    
    if (await emailInput.isVisible()) {
      console.log('   - Filling Cake Login Credentials...');
      await emailInput.fill(CONFIG.CAKE_USERNAME);
      await page.locator('input[type="password"], #password').first().fill(CONFIG.CAKE_PASSWORD);
      await page.locator('button[type="submit"], input[type="submit"], #submitButton, button:has-text("Log In")').first().click();
      await page.waitForNavigation({ waitUntil: 'networkidle', timeout: 30000 }).catch(() => {});
      console.log('   - Logged into Cake successfully.');
    } else {
      console.log('   - Cake login form not visible, assuming already logged in.');
    }

    // Navigate to Homepage after login
    await page.goto(`${CONFIG.CAKE_URL}/`, { waitUntil: 'networkidle' });

    // Look for global search box
    const searchSelectors = [
      'input[placeholder*="Search"]',
      'input[placeholder*="Lead"]',
      'input[type="search"]',
      'input[id*="search"]'
    ];

    let searchFound = false;
    for (const selector of searchSelectors) {
      const searchBox = await page.$(selector);
      if (searchBox) {
        await searchBox.fill(leadId);
        await page.waitForTimeout(500);
        await searchBox.press('Enter');
        await page.waitForTimeout(5000); // Wait for the lead page to load
        searchFound = true;
        break;
      }
    }

    if (searchFound) {
      // Check if we are on the lead page or if there's a link to click
      console.log(`   - Attempting to open lead popup for ${leadId}...`);
      
      // Specifically target the link containing exactly the Lead ID
      const exactLeadLink = page.locator(`a:has-text("${leadId}")`);
      
      if (await exactLeadLink.count() > 0) {
        await exactLeadLink.first().click();
        await page.waitForTimeout(3000); // Wait for the Lead Details popup to load
      } else {
        console.log(`   - Could not find a clickable link for ${leadId} in the search results.`);
      }

      // Check if tabs exist on the current page (Cake lead view)
      const tabsExist = await page.locator('[role="tab"], .tab, li[role="tab"], .x-tab-strip-text').count();
      if (tabsExist > 0) {
         result.inCake = 'TRUE'; 
         console.log(`   - Successfully opened lead popup. Validating tabs...`);

         const personalTab = page.locator('.x-tab-strip-text, [role="tab"]').filter({ hasText: /^Personal Information$|^Personal Info$/ }).first();
         if (await personalTab.isVisible()) {
            await personalTab.click({ force: true });
            await page.waitForTimeout(1000);
            result.tabs.personalInfoVerified = true;
         }

         const saleTab = page.locator('.x-tab-strip-text, [role="tab"]').filter({ hasText: /^Sale Info$|^Sale Information$/ }).first();
         if (await saleTab.isVisible()) {
            await saleTab.click({ force: true });
            await page.waitForTimeout(1000);
            result.tabs.saleInfoVerified = true;
         }

         const verticalTab = page.locator('.x-tab-strip-text, [role="tab"]').filter({ hasText: /^Vertical Specific$/ }).first();
         if (await verticalTab.isVisible()) {
            await verticalTab.click({ force: true });
            await page.waitForTimeout(1000);
            result.tabs.verticalVerified = true;
         }
      }
    }
  } catch (error) {
    console.error('Error during Cake verification:', error);
  }

  return result;
}

async function verifyCDB(page, leadId) {
  const result = {
    inCDB: 'Not Found'
  };

  try {
    await page.goto(CONFIG.CDB_LOGIN_URL, { waitUntil: 'networkidle' });

    // Login if needed
    const emailField = page.locator('input[name="email"], input[type="email"]');
    if (await emailField.count() > 0) {
      await emailField.fill(CONFIG.CDB_EMAIL);
      await page.locator('input[name="password"], input[type="password"]').fill(CONFIG.CDB_PASSWORD);
      await page.locator('button[type="submit"], input[type="submit"]').click();
      await page.waitForLoadState('networkidle');
    }

    // Go to Lead Listing
    const leadListingTab = page.locator('[role="tab"]:has-text("Lead Listing"), a:has-text("Lead Listing")').first();
    if (await leadListingTab.isVisible()) {
      await leadListingTab.click();
      await page.waitForTimeout(2000);
    }

    // Search Lead ID
    const searchBoxes = page.locator('input[type="search"]');
    if (await searchBoxes.count() > 1) {
      await searchBoxes.nth(1).fill(leadId);
      await page.waitForTimeout(500);
      await searchBoxes.nth(1).press('Enter');

      try {
        const searchBox = searchBoxes.nth(1);
        const formSubmitBtn = searchBox.locator('xpath=ancestor::form//button[@type="submit"]').first();
        if (await formSubmitBtn.isVisible()) {
          await formSubmitBtn.click();
        } else {
          const adjacentSubmitBtn = searchBox.locator('xpath=following-sibling::button[@type="submit"]').first();
          if (await adjacentSubmitBtn.isVisible()) {
            await adjacentSubmitBtn.click();
          }
        }
      } catch (err) { }

      await page.waitForTimeout(2000);

      const tableBody = page.locator('table tbody');
      if (await tableBody.isVisible()) {
        const rowText = await tableBody.innerText();
        if (rowText.includes(leadId)) {
          result.inCDB = 'TRUE';
        }
      }
    }
  } catch (error) {
    console.error('Error during CDB verification:', error);
  }

  return result;
}

async function runE2EValidation() {
  const isHeaded = process.argv.includes('--headed');
  const sheetNameArg = process.argv.find(arg => arg.startsWith('--sheet='));
  const sheetName = sheetNameArg ? sheetNameArg.split('=')[1] : 'FSI - MAIN'; // Default to a TRK sheet tab
  
  const leadIdArg = process.argv.find(arg => arg.startsWith('--lead-id='));

  console.log(`\n======================================================`);
  console.log(` FLM END-TO-END CAKE VALIDATION PROCESS`);
  console.log(`======================================================`);

  let leadData = null;

  const cliLeadId = process.argv[2] && !process.argv[2].startsWith('--') ? process.argv[2] : null;

  if (cliLeadId) {
    console.log(`=> Using provided Lead ID from CLI: ${cliLeadId}`);
    leadData = {
      rowIndex: -1,
      dateTime: new Date().toISOString(),
      affiliate: 'Unknown',
      leadId: cliLeadId,
      dbid: 'Unknown',
      pageOrigin: 'Unknown',
      thankYouUrl: 'Unknown',
      pixelFired: 'Unknown',
      taxDebt: 'Unknown',
      neustar: 'Unknown',
      neustarDisposition: 'Unknown'
    };
  } else {
    console.log(`=> Extracting the absolute latest lead across ALL tabs in the TRK Link Sheet...`);
    leadData = await googleSheetsUtils.getAbsoluteLatestLeadAcrossAllTabs(TRK_SHEET_ID);
    
    if (!leadData) {
      console.error('❌ Failed to extract latest lead from TRK sheet.');
      process.exit(1);
    }
    
    console.log(`=> Found Latest Lead ID: ${leadData.leadId} (From tab: [${leadData.sheetName}], Date: ${leadData.dateTime})`);
  }

  const browser = await chromium.launch({ headless: !isHeaded, slowMo: isHeaded ? 100 : 0 });
  const context = await browser.newContext();
  const page = await context.newPage();

  console.log(`\n=> Logging into Cake and Searching for Lead...`);
  const cakeResult = await verifyCakeTabs(page, leadData.leadId);
  console.log(`   - In Cake: ${cakeResult.inCake}`);
  console.log(`   - Tabs Verified: ${Object.keys(cakeResult.tabs).length}`);

  console.log(`\n=> Logging into CDB...`);
  const cdbResult = await verifyCDB(page, leadData.leadId);
  console.log(`   - In CDB: ${cdbResult.inCDB}`);

  await browser.close();

  console.log(`\n=> Formatting data for Google Sheets...`);
  
  // Format Date to dd-mm-yy Time
  const now = new Date();
  const day = String(now.getDate()).padStart(2, '0');
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const year = String(now.getFullYear()).slice(-2);
  const time = now.toLocaleTimeString('en-US', { hour12: false }); // 24-hour time or adjust as needed
  const formattedDateTime = `${day}-${month}-${year} ${time}`;

  // Hyperlink for Page Origin
  const pageOriginLink = leadData.pageOrigin && leadData.pageOrigin.startsWith('http') 
    ? `=HYPERLINK("${leadData.pageOrigin}", "View Page Origin")` 
    : leadData.pageOrigin || 'View Page Origin';

  // Construct Final Array for Master Sheet "After Cake Validation" Tab
  const finalRowData = [
    pageOriginLink,                      // A: Page URL
    leadData.leadId,                     // B: Lead ID
    cakeResult.inCake,                   // C: In Cake
    cdbResult.inCDB,                     // D: In CDB
    "TRUE",                              // E: IS Test (Default to TRUE for automation)
    leadData.pixelFired || "Yes",        // F: Pixel Fired
    leadData.affiliate || "QA affiliate",// G: Affiliate
    leadData.taxDebt || "under",         // H: Tax Debt
    leadData.neustar || "under",         // I: Neustar
    leadData.neustarDisposition || "",   // J: Neustar Disposition
    leadData.dbid || "",                 // K: DBID
    formattedDateTime                    // L: Date
  ];

  console.log(`=> Appending to Master Sheet [${MASTER_SHEET_ID}] -> [${AFTER_CAKE_TAB_NAME}]`);
  
  try {
    const success = await googleSheetsUtils.appendRawRow(MASTER_SHEET_ID, AFTER_CAKE_TAB_NAME, finalRowData);
    if (success) {
      console.log('✅ Final validation row appended to Master Sheet successfully!');
    } else {
      console.log('❌ Failed to append row to Master Sheet.');
    }
  } catch (err) {
    console.error('❌ Error appending to Google Sheets:', err.message);
  }
}

runE2EValidation();
