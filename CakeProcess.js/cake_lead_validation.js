/**
 * FLM AUTOMATION AGENT - Cake Lead Validation & CDB Verification
 * 
 * ⚙️ EXECUTION MODE: HEADED (Browser Visible)
 * 
 * 📌 STEP-BY-STEP AUTOMATION:
 * 1. Extract latest Lead ID from scheduler
 * 2. Open Cake homepage & search Lead ID
 * 3. Validate Lead popup & tabs
 * 4. Verify IS Test checkbox status
 * 5. Open CDB & search Lead ID
 * 6. Update FML Project dashboard
 * 7. Generate final report with screenshots
 * 
 * ⚠️ FAILURE RULES: Never stop on non-critical failures
 *    - Continue execution through all steps
 *    - Capture screenshots on every failure
 *    - Ensure full end-to-end completion
 */

const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '..', '.env') });

const utils = require('./cake_utils');
const googleSheetsUtils = require('../utils/googleSheetsUtils');

// 🎯 FLM AGENT EXECUTION TRACKER
const EXECUTION = {
  leadId: null,
  leadSource: null,
  cakeStatus: 'PENDING',
  cdbStatus: 'PENDING',
  dashboardStatus: 'PENDING',
  screenshots: [],
  validations: {}
};

// Configuration
const CONFIG = {
  CAKE_HOMEPAGE: 'https://app.forwardleapmarketing.com/',
  CDB_LOGIN_URL: 'https://www.flmreporting.com/flm_central_leads/auth/login.php',
  CDB_CREDENTIALS: {
    email: 'nirav.dobariya@bytestechnolab.com',
    password: 'Nirav@1234'
  },
  CAKE_CREDENTIALS: {
    username: process.env.CAKE_USERNAME || 'urvish.patel@bytestechnolab.com',
    password: process.env.CAKE_PASSWORD || 'Urvish@123#2026-06'
  },
  REPORT_DIR: path.join(__dirname, 'lead_validation_reports'),
  SCREENSHOT_DIR: path.join(__dirname, 'lead_validation_screenshots'),
  DASHBOARD_DIR: path.join(__dirname, '..', 'FML_Project_Dashboard')
};

// Ensure directories exist
function ensureDirectories() {
  [CONFIG.REPORT_DIR, CONFIG.SCREENSHOT_DIR, CONFIG.DASHBOARD_DIR].forEach(dir => {
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
      console.log(`✓ Created directory: ${dir}`);
    }
  });
}

function setupLogging() {
  const logFile = path.join(CONFIG.REPORT_DIR, `execution_${Date.now()}.log`);
  return logFile;
}

/**
 * Extract latest Lead ID from scheduler execution
 */
async function extractLatestLeadID(logFile) {
  utils.writeLog(logFile, 'Extracting latest Lead ID from scheduler execution', 'INFO');

  try {
    // Allow overriding with a CLI argument for specific Lead ID
    const leadIdArg = process.argv.find(arg => arg.startsWith('--lead-id='));
    if (leadIdArg) {
      const cliLeadId = leadIdArg.split('=')[1];
      utils.writeLog(logFile, `✓ Using Lead ID from CLI argument: ${cliLeadId}`, 'INFO');
      return cliLeadId;
    }

    // ==========================================================
    // NEW: FETCH LEAD ID FROM GOOGLE SHEETS
    // ==========================================================
    const sheetNameArg = process.argv.find(arg => arg.startsWith('--sheet-name='));
    const sheetName = sheetNameArg ? sheetNameArg.split('=')[1] : 'Senior Tax Defense (X)';
    
    utils.writeLog(logFile, `Connecting to Google Sheets to extract latest Lead ID from tab: "${sheetName}"...`, 'INFO');
    
    const sheetLeadId = await googleSheetsUtils.getLatestLeadIdFromSheet(sheetName);
    if (sheetLeadId) {
      utils.writeLog(logFile, `✓ Successfully extracted latest Lead ID from Google Sheets: ${sheetLeadId}`, 'INFO');
      return sheetLeadId;
    }

    // ==========================================================
    // FALLBACK: Look for latest execution results locally
    // ==========================================================
    utils.writeLog(logFile, `[WARN] Failed to extract from Google Sheets. Falling back to local JSON reports...`, 'WARN');
    const reportsDir = CONFIG.REPORT_DIR;
    let latestResult = null;
    let latestTimestamp = 0;

    if (fs.existsSync(reportsDir)) {
      const files = fs.readdirSync(reportsDir).filter(f => f.endsWith('.json'));
      for (const file of files) {
        const filePath = path.join(reportsDir, file);
        try {
          const content = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
          const timestamp = new Date(content.executionTime || content.timestamp || fs.statSync(filePath).mtime).getTime();
          
          if (timestamp > latestTimestamp) {
            latestTimestamp = timestamp;
            latestResult = content;
          }
        } catch(e) {}
      }
    }

    // Allow overriding with a CLI argument (duplicate check removed)

    // Support both schema variations
    const leadsArray = (latestResult && (latestResult.details || latestResult.results)) || [];

    if (leadsArray.length > 0) {
      // Extract Lead IDs from results
      const leadIds = leadsArray
        .map(d => d.leadId || d.lead_id)
        .filter(id => id);

      if (leadIds.length > 0) {
        const selectedLeadId = leadIds[0];
        utils.writeLog(logFile, `✓ Extracted latest Lead ID: ${selectedLeadId}`, 'INFO');
        return selectedLeadId;
      }
    }

    // Fallback: Try to extract from last execution report
    utils.writeLog(logFile, 'No Lead ID found in results, using dynamic generation', 'WARN');
    const dynamicLeadId = `TEST_${Date.now()}`;
    return dynamicLeadId;

  } catch (error) {
    utils.writeLog(logFile, `Error extracting Lead ID: ${error.message}`, 'ERROR');
    return null;
  }
}

/**
 * Open Cake homepage and search for Lead ID
 */
async function searchLeadInCake(page, leadId, logFile) {
  utils.writeLog(logFile, `Searching Lead ID in Cake: ${leadId}`, 'INFO');

  try {
    await page.goto(CONFIG.CAKE_HOMEPAGE, { waitUntil: 'networkidle', timeout: 30000 });
    await page.waitForTimeout(2000);

    // Look for search box
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
        await page.waitForTimeout(2000);
        searchFound = true;
        utils.writeLog(logFile, `✓ Searched for Lead ID: ${leadId}`, 'INFO');
        break;
      }
    }

    if (!searchFound) {
      utils.writeLog(logFile, 'Search box not found', 'WARN');
    }

    // Take screenshot
    const screenshotPath = await utils.captureScreenshot(
      page,
      `01_lead_search_${leadId}_${Date.now()}.png`,
      CONFIG.SCREENSHOT_DIR
    );
    utils.writeLog(logFile, `Screenshot: ${screenshotPath}`, 'INFO');

    return true;
  } catch (error) {
    utils.writeLog(logFile, `Error searching Lead in Cake: ${error.message}`, 'ERROR');
    return false;
  }
}

/**
 * Open Lead popup and verify details
 */
async function openAndVerifyLeadPopup(page, logFile) {
  utils.writeLog(logFile, 'Opening Lead popup and verifying details', 'INFO');

  const leadDetails = {
    isTest: null,
    tabs: {},
    dataValidation: []
  };

  try {
    // Click Lead ID link (blue color clickable)
    const leadLinks = await page.locator('a[style*="color"], a:has-text("[0-9]")').all();
    
    if (leadLinks.length > 0) {
      await leadLinks[0].click();
      await page.waitForTimeout(2000);
      utils.writeLog(logFile, 'Clicked Lead ID popup link', 'INFO');

      // Check if "IS Test" checkbox is checked
      const testCheckbox = await page.$('input[type="checkbox"][id*="test"], input[type="checkbox"][name*="test"]');
      if (testCheckbox) {
        leadDetails.isTest = await testCheckbox.isChecked();
        utils.writeLog(logFile, `IS Test checkbox status: ${leadDetails.isTest ? 'CHECKED' : 'UNCHECKED'}`, 'INFO');
      }

      // Get all tabs in popup
      const tabs = await page.locator('[role="tab"], .tab, li[role="tab"]').allTextContents();
      utils.writeLog(logFile, `Found tabs: ${tabs.join(', ')}`, 'INFO');

      // Validate each tab
      for (const tab of tabs) {
        utils.writeLog(logFile, `Validating tab: ${tab}`, 'INFO');
        
        const tabButton = await page.locator(`[role="tab"]:has-text("${tab}"), .tab:has-text("${tab}")`).first();
        if (tabButton) {
          await tabButton.click();
          await page.waitForTimeout(1000);

          // Check for blank values
          const inputs = await page.locator('input, select, textarea').all();
          let blankCount = 0;

          for (const input of inputs) {
            const value = await input.inputValue().catch(() => '');
            if (!value || value.trim() === '') {
              blankCount++;
            }
          }

          leadDetails.tabs[tab] = {
            fieldCount: inputs.length,
            blankCount: blankCount,
            dataValid: blankCount === 0
          };

          utils.writeLog(logFile, `  Tab: ${tab} - Fields: ${inputs.length}, Blank: ${blankCount}`, 'INFO');
        }
      }

      // Take screenshot of popup
      const screenshotPath = await utils.captureScreenshot(
        page,
        `02_lead_popup_${Date.now()}.png`,
        CONFIG.SCREENSHOT_DIR
      );
      utils.writeLog(logFile, `Screenshot: ${screenshotPath}`, 'INFO');
    }

    return leadDetails;
  } catch (error) {
    utils.writeLog(logFile, `Error opening lead popup: ${error.message}`, 'ERROR');
    return leadDetails;
  }
}

/**
 * Open CDB and search for Lead ID
 */
async function searchLeadInCDB(page, leadId, logFile) {
  utils.writeLog(logFile, `Searching Lead ID in CDB: ${leadId}`, 'INFO');

  let cdbStatus = 'NOT FOUND';

  try {
    // Navigate to CDB login
    await page.goto(CONFIG.CDB_LOGIN_URL, { waitUntil: 'networkidle', timeout: 30000 });
    await page.waitForTimeout(2000);

    // Login to CDB
    utils.writeLog(logFile, 'Logging into CDB', 'INFO');
    
    const emailInput = await page.$('input[type="email"], input[placeholder*="Email"]');
    if (emailInput) {
      await emailInput.fill(CONFIG.CDB_CREDENTIALS.email);
      utils.writeLog(logFile, 'Entered CDB email', 'INFO');
    }

    const passwordInput = await page.$('input[type="password"]');
    if (passwordInput) {
      await passwordInput.fill(CONFIG.CDB_CREDENTIALS.password);
      utils.writeLog(logFile, 'Entered CDB password', 'INFO');
    }

    const loginBtn = await page.$('button[type="submit"], button:has-text("Login"), button:has-text("Sign In")');
    if (loginBtn) {
      await loginBtn.click();
      utils.writeLog(logFile, 'Clicked CDB login button', 'INFO');
      
      try {
        await page.waitForNavigation({ waitUntil: 'networkidle', timeout: 20000 });
      } catch (e) {
        await page.waitForTimeout(3000);
      }
    }

    // Navigate to Lead Listing tab
    const leadListingTab = await page.locator('[role="tab"]:has-text("Lead Listing"), a:has-text("Lead Listing")').first();
    if (await leadListingTab.isVisible({ timeout: 3000 }).catch(() => false)) {
      await leadListingTab.click();
      await page.waitForTimeout(2000);
      utils.writeLog(logFile, 'Opened Lead Listing tab', 'INFO');
    }

    // Search for Lead ID in second search box
    const searchBoxes = await page.locator('input[type="search"], input[placeholder*="Search"]').all();
    
    if (searchBoxes.length >= 2) {
      // Use second search box
      await searchBoxes[1].fill(leadId);
      await page.waitForTimeout(500);
      await searchBoxes[1].press('Enter');
      
      // Physically click the Search button associated with this input
      try {
        const searchBox = searchBoxes[1];
        const formSubmitBtn = searchBox.locator('xpath=ancestor::form//button[@type="submit"] | ancestor::form//input[@type="submit"]').first();
        if (await formSubmitBtn.isVisible()) {
          await formSubmitBtn.click();
        } else {
          const siblingBtn = searchBox.locator('xpath=../button | ../input[@type="button"] | ../input[@type="submit"]').first();
          if (await siblingBtn.isVisible()) {
            await siblingBtn.click();
          } else {
            const globalBtn = page.locator('button:has-text("Search"), input[value="Search"], input[type="submit"]').first();
            if (await globalBtn.isVisible()) {
              await globalBtn.click();
            }
          }
        }
      } catch (e) {}

      await page.waitForTimeout(2000);
      utils.writeLog(logFile, `Searched for Lead ID in CDB: ${leadId}`, 'INFO');

      // Check if results found
      const resultRows = await page.locator('table tr, [role="row"]').all();
      
      if (resultRows.length > 1) {
        // Check if Lead ID is in results
        let found = false;
        for (const row of resultRows) {
          const rowText = await row.textContent();
          if (rowText.includes(leadId)) {
            found = true;
            break;
          }
        }
        cdbStatus = found ? 'FOUND' : 'NOT FOUND';
      } else {
        cdbStatus = 'NOT FOUND';
      }
    }

    utils.writeLog(logFile, `CDB Status: ${cdbStatus}`, 'INFO');

    // Take screenshot
    const screenshotPath = await utils.captureScreenshot(
      page,
      `03_cdb_search_${cdbStatus}_${Date.now()}.png`,
      CONFIG.SCREENSHOT_DIR
    );
    utils.writeLog(logFile, `Screenshot: ${screenshotPath}`, 'INFO');

    return cdbStatus;
  } catch (error) {
    utils.writeLog(logFile, `Error searching in CDB: ${error.message}`, 'ERROR');
    return cdbStatus;
  }
}

/**
 * Create/update FML Project dashboard
 */
async function updateDashboard(leadId, leadDetails, cdbStatus, logFile) {
  utils.writeLog(logFile, 'Updating FML Project dashboard', 'INFO');

  try {
    const now = new Date();
    const monthFolder = path.join(CONFIG.DASHBOARD_DIR, `${now.toLocaleString('default', { month: 'long' })}_${now.getFullYear()}`);
    const sheetName = `Sheet_${now.getMonth() + 1}_${now.getFullYear()}`;
    const csvPath = path.join(monthFolder, `${sheetName}.csv`);

    // Create month folder if not exists
    if (!fs.existsSync(monthFolder)) {
      fs.mkdirSync(monthFolder, { recursive: true });
      utils.writeLog(logFile, `Created month folder: ${monthFolder}`, 'INFO');
    }

    // Prepare data row
    const dataRow = {
      Timestamp: new Date().toISOString(),
      URL: CONFIG.CAKE_HOMEPAGE,
      'Lead ID': leadId,
      'IS Test': leadDetails.isTest ? 'YES' : 'NO',
      'Tabs Validated': Object.keys(leadDetails.tabs).length,
      'CDB Status': cdbStatus,
      'Data Valid': Object.values(leadDetails.tabs).every(t => t.dataValid) ? 'YES' : 'NO'
    };

    // Write to CSV
    const headers = Object.keys(dataRow);
    const values = Object.values(dataRow);

    let csvContent = '';
    
    if (!fs.existsSync(csvPath)) {
      // Create new file with headers
      csvContent = headers.join(',') + '\n';
      csvContent += values.map(v => `"${v}"`).join(',');
      utils.writeLog(logFile, 'Created new dashboard sheet', 'INFO');
    } else {
      // Append to existing file
      csvContent = '\n' + values.map(v => `"${v}"`).join(',');
      utils.writeLog(logFile, 'Appended to existing dashboard sheet', 'INFO');
    }

    fs.appendFileSync(csvPath, csvContent);
    utils.writeLog(logFile, `✓ Updated dashboard: ${csvPath}`, 'INFO');

    return csvPath;
  } catch (error) {
    utils.writeLog(logFile, `Error updating dashboard: ${error.message}`, 'ERROR');
    return null;
  }
}

/**
 * Generate comprehensive report
 */
function generateReport(leadId, leadDetails, cdbStatus, dashboardPath, logFile) {
  utils.writeLog(logFile, 'Generating comprehensive report', 'INFO');

  const report = {
    executionTime: new Date().toISOString(),
    leadId: leadId,
    cakeValidation: {
      leadFound: leadDetails.tabs && Object.keys(leadDetails.tabs).length > 0,
      isTest: leadDetails.isTest,
      tabsValidated: Object.keys(leadDetails.tabs),
      tabDetails: leadDetails.tabs
    },
    cdbValidation: {
      status: cdbStatus,
      found: cdbStatus === 'FOUND'
    },
    dashboardUpdate: {
      path: dashboardPath,
      success: !!dashboardPath
    }
  };

  const reportPath = utils.saveReport(
    report,
    `lead_validation_report_${leadId}_${Date.now()}.json`
  );

  utils.writeLog(logFile, `Report saved: ${reportPath}`, 'INFO');
  return report;
}

/**
 * Main execution
 */
async function runLeadValidation() {
  console.log('='.repeat(70));
  console.log('FLM Agent - Cake Lead Validation & CDB Verification Process');
  console.log('='.repeat(70));
  console.log('');

  ensureDirectories();
  const logFile = setupLogging();
  const startTime = Date.now();

  utils.writeLog(logFile, 'Lead Validation & CDB Verification Process Started', 'INFO');

  let browser;
  
  try {
    // Extract latest Lead ID
    const leadId = await extractLatestLeadID(logFile);
    if (!leadId) {
      throw new Error('Could not extract Lead ID');
    }

    // Launch browser
    utils.writeLog(logFile, 'Launching browser', 'INFO');
    const isHeaded = process.argv.includes('--headed');
    browser = await utils.launchBrowser(isHeaded);
    const context = await browser.newContext();
    const page = await context.newPage();

    // Step 1: Search Lead in Cake
    utils.writeLog(logFile, '--- STEP 1: Search Lead in Cake ---', 'INFO');
    await searchLeadInCake(page, leadId, logFile);

    // Step 2: Open and verify Lead popup
    utils.writeLog(logFile, '--- STEP 2: Verify Lead Popup Details ---', 'INFO');
    const leadDetails = await openAndVerifyLeadPopup(page, logFile);

    // Step 3: Search Lead in CDB
    utils.writeLog(logFile, '--- STEP 3: Search Lead in CDB ---', 'INFO');
    const cdbStatus = await searchLeadInCDB(page, leadId, logFile);

    // Step 4: Update FML Project dashboard
    utils.writeLog(logFile, '--- STEP 4: Update FML Project Dashboard ---', 'INFO');
    const dashboardPath = await updateDashboard(leadId, leadDetails, cdbStatus, logFile);

    // Step 5: Generate report
    const report = generateReport(leadId, leadDetails, cdbStatus, dashboardPath, logFile);

    // Summary
    const duration = ((Date.now() - startTime) / 1000).toFixed(2);
    utils.writeLog(logFile, `Execution completed in ${duration} seconds`, 'INFO');

    console.log('');
    console.log('='.repeat(70));
    console.log('✅ Lead Validation & CDB Verification Complete');
    console.log('='.repeat(70));
    console.log(`Lead ID: ${leadId}`);
    console.log(`Cake Status: ${Object.keys(leadDetails.tabs).length} tabs validated`);
    console.log(`CDB Status: ${cdbStatus}`);
    console.log(`Dashboard: ${dashboardPath ? 'Updated' : 'Failed'}`);
    console.log(`Duration: ${duration}s`);
    console.log('='.repeat(70));
    console.log('');

  } catch (error) {
    utils.writeLog(logFile, `FATAL ERROR: ${error.message}`, 'ERROR');
    console.error('Process failed:', error.message);
  } finally {
    if (browser) {
      await browser.close();
      utils.writeLog(logFile, 'Browser closed', 'INFO');
    }
    utils.writeLog(logFile, 'Process finished', 'INFO');
  }
}

// Execute
runLeadValidation().catch(error => {
  console.error('Unhandled error:', error);
  process.exit(1);
});
