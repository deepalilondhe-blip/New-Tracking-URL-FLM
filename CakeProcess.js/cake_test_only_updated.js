/**
 * FLM Agent - Cake "Test Only" Validation Script - UPDATED
 * 
 * IMPLEMENTS FULL FLM AGENT PLAN AS SPECIFIED
 * 
 * Process Flow:
 * 1. Open Cake → Reports → Conversions.
 * 2. Select:
 *    * Start Date = Latest Scheduler Date
 *    * End Date = Current Date
 *    * Filter = Test Only
 * 3. Run the report.
 * 4. Scan all pages and count occurrences of every unique IP.
 * 5. Store IP counts in the format: IP : Count
 * 6. Select 3 different unique IPs.
 * 7. For each selected IP:
 *    * Pick any one associated Lead ID.
 *    * Open the Lead ID.
 *    * Verify:
 *      * First Name = CKMTESTPIXEL
 *      * Last Name = CKMTESTPIXEL
 *      * Email = ckmtestpixel@gmail.com
 *      * Is Test checkbox = Checked
 * 8. Open Google Sheet → Test Only IP Data tab.
 * 9. Create headers if not available:
 *    * Date
 *    * Lead ID
 *    * IP & IP Count
 *    * IS Test
 *    * Name & Email Validation
 * 10. Append 3 new rows (one row per validated IP).
 * 11. Store:
 *    * Current Date
 *    * Selected Lead ID
 *    * IP : Count
 *    * IS Test = True/False
 *    * Name & Email Validation = Correct/Incorrect
 */

const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '..', '.env') });

const utils = require('./cake_utils');
const googleSheets = require('../utils/googleSheetsUtils');
const { google } = require('googleapis');

// Configuration - Test Only Process
const CONFIG = {
  TEST_USER_INFO: {
    firstName: 'CKMTESTPIXEL',
    lastName: 'CKMTESTPIXEL',
    email: 'ckmtestpixel@gmail.com'
  },
  DEVELOPER_EMAIL: process.env.DEVELOPER_EMAIL || 'deepali.londhe@magnetoitsolutions.com',
  AUTH_STATE_PATH: path.join(__dirname, 'cake-auth-state.json'),
  SCRIPT_NAME: 'cake_test_only_updated',
  REPORT_DIR: path.resolve(__dirname, 'test_only_reports'),
  SCREENSHOT_DIR: path.resolve(__dirname, 'test_only_screenshots'),
  GOOGLE_SHEET_ID: process.env.GOOGLE_SHEET_ID,
  SHEET_TAB_NAME: 'Test Only IP Data'
};

// Create necessary directories
function ensureDirectories() {
  [CONFIG.REPORT_DIR, CONFIG.SCREENSHOT_DIR].forEach(dir => {
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
      console.log(`✓ Created directory: ${dir}`);
    }
  });
}

// Setup logging
function setupLogging() {
  const logFile = path.join(CONFIG.REPORT_DIR, `execution_${Date.now()}.log`);
  return logFile;
}

/**
 * Handle Cake CRM Login
 */
async function handleLogin(page, logFile) {
  utils.writeLog(logFile, 'Checking if login is required', 'INFO');
  
  try {
    const loginButton = await page.$('#submitButton, button:has-text("Log In"), input[type="submit"]');
    
    if (loginButton) {
      utils.writeLog(logFile, 'Login form detected - attempting to log in', 'INFO');
      
      const username = process.env.CAKE_USERNAME || 'urvish.patel@bytestechnolab.com';
      const password = process.env.CAKE_PASSWORD || 'Urvish@123#2026-06';
      
      const usernameField = await page.$('#u, input[name="u"], input[type="text"]');
      const passwordField = await page.$('#password, input[name="p"], input[type="password"]');
      
      if (usernameField && passwordField && loginButton) {
        await page.waitForSelector('#u, input[name="u"], input[type="text"]', { timeout: 15000 });
        await page.waitForSelector('#password, input[name="p"], input[type="password"]', { timeout: 15000 });
        await page.waitForSelector('#submitButton, button:has-text("Log In"), input[type="submit"]', { timeout: 15000 });
        
        await usernameField.click();
        await usernameField.fill('');
        await page.locator('#u, input[name="u"], input[type="text"]').first().type(username, { delay: 40 });
        await page.waitForTimeout(300);
        utils.writeLog(logFile, `Entered username: ${username}`, 'INFO');
        
        await passwordField.click();
        await passwordField.fill('');
        await page.locator('#password, input[name="p"], input[type="password"]').first().type(password, { delay: 40 });
        await page.waitForTimeout(300);
        utils.writeLog(logFile, 'Entered password', 'INFO');
        
        utils.writeLog(logFile, 'Clicking Log In button...', 'INFO');
        await loginButton.click();
        
        utils.writeLog(logFile, 'Waiting for login to complete...', 'INFO');
        let loginSuccess = false;
        const startTime = Date.now();
        const timeoutMs = 30000;
        
        while (Date.now() - startTime < timeoutMs) {
          await page.waitForTimeout(500);
          
          const isLoginStillVisible = await page.locator('#submitButton, button:has-text("Log In")').first().isVisible().catch(() => false);
          const currentUrl = page.url();
          
          if (!isLoginStillVisible && !currentUrl.includes('app.forwardleapmarketing.com/?')) {
            utils.writeLog(logFile, `✓ Login successful - navigated to: ${currentUrl}`, 'INFO');
            loginSuccess = true;
            break;
          }
        }
        
        if (!loginSuccess) {
          utils.writeLog(logFile, '⚠ Login may have failed - button still visible', 'WARN');
        }
        
        await page.waitForTimeout(3000);
        utils.writeLog(logFile, '✓ Login process completed', 'INFO');
        return true;
      } else {
        utils.writeLog(logFile, 'Could not find login form fields', 'ERROR');
        return false;
      }
    } else {
      utils.writeLog(logFile, 'No login form found - already logged in', 'INFO');
      return true;
    }
  } catch (error) {
    utils.writeLog(logFile, `Login error: ${error.message}`, 'ERROR');
    return false;
  }
}

/**
 * Navigate to Reports → Conversions
 */
async function navigateToConversions(page, logFile) {
  utils.writeLog(logFile, 'Navigating to Cake Reports > Conversions', 'INFO');
  
  try {
    await page.waitForTimeout(2000);
    utils.writeLog(logFile, 'Looking for Conversions menu item...', 'INFO');

    const conversionsLink = page.locator('a:has-text("Conversions")').first();
    const isVisible = await conversionsLink.isVisible({ timeout: 5000 }).catch(() => false);
    
    if (isVisible) {
      utils.writeLog(logFile, '✓ Found Conversions link - clicking it', 'INFO');
      await conversionsLink.click();
      
      await page.waitForNavigation({ waitUntil: 'domcontentloaded', timeout: 15000 }).catch(() => {
        utils.writeLog(logFile, 'Navigation timeout - continuing anyway', 'WARN');
      });
      await page.waitForTimeout(2000);
      
      const screenshotFile = `01_after_conversions_click_${Date.now()}.png`;
      const screenshotPath = path.join(CONFIG.SCREENSHOT_DIR, screenshotFile);
      await page.screenshot({ path: screenshotPath }).catch(err => {
        utils.writeLog(logFile, `Screenshot failed: ${err.message}`, 'WARN');
      });
      utils.writeLog(logFile, `✓ Successfully navigated to Conversions (screenshot: ${screenshotPath})`, 'INFO');
      return true;
    }

    utils.writeLog(logFile, 'Conversions link not directly visible - trying REPORTS menu', 'WARN');
    
    const reportsSelectors = [
      'button:has-text("REPORTS")',
      'a:has-text("REPORTS")',
      '[role="button"]:has-text("REPORTS")'
    ];

    let reportsClicked = false;
    for (const selector of reportsSelectors) {
      try {
        const element = page.locator(selector).first();
        if (await element.isVisible({ timeout: 2000 }).catch(() => false)) {
          await element.click();
          await page.waitForTimeout(1000);
          utils.writeLog(logFile, `✓ Clicked REPORTS menu`, 'INFO');
          reportsClicked = true;
          break;
        }
      } catch (e) {
      }
    }

    if (reportsClicked) {
      await page.waitForTimeout(500);
      const conversionsLink2 = page.locator('a:has-text("Conversions")').first();
      if (await conversionsLink2.isVisible({ timeout: 3000 }).catch(() => false)) {
        await conversionsLink2.click();
        await page.waitForNavigation({ waitUntil: 'domcontentloaded', timeout: 15000 }).catch(() => {
          utils.writeLog(logFile, 'Navigation timeout - continuing anyway', 'WARN');
        });
        await page.waitForTimeout(2000);
        utils.writeLog(logFile, '✓ Successfully navigated to Conversions', 'INFO');
        return true;
      }
    }

    utils.writeLog(logFile, 'Menu navigation failed - trying direct URL navigation', 'WARN');
    const currentUrl = page.url();
    const baseUrl = new URL(currentUrl).origin;
    const conversionsUrl = `${baseUrl}/reports/conversion`;
    
    utils.writeLog(logFile, `Navigating directly to: ${conversionsUrl}`, 'INFO');
    await page.goto(conversionsUrl, { waitUntil: 'domcontentloaded', timeout: 15000 }).catch(err => {
      utils.writeLog(logFile, `Direct navigation error: ${err.message}`, 'ERROR');
    });
    
    await page.waitForTimeout(2000);

    const pageContent = await page.locator('body').innerText().catch(() => '');
    const finalUrl = page.url();
    
    if (pageContent.includes('Conversion') || finalUrl.includes('conversion')) {
      utils.writeLog(logFile, '✓ Successfully navigated to Conversions page via direct URL', 'INFO');
      return true;
    }

    utils.writeLog(logFile, 'Could not navigate to Conversions page', 'ERROR');
    return false;

  } catch (error) {
    utils.writeLog(logFile, `Navigation error: ${error.message}`, 'ERROR');
    return false;
  }
}

/**
 * Set date range from scheduler
 */
async function setDateRange(page, logFile) {
  utils.writeLog(logFile, 'Setting date range from scheduler', 'INFO');
  
  const dateRange = utils.getSchedulerDateRange();
  utils.writeLog(logFile, `Date range: ${dateRange.displayStart} to ${dateRange.displayEnd}`, 'INFO');

  try {
    const dateInputs = await page.locator('input[type="date"], input[placeholder*="Date"], input[id*="Date"]').all();
    
    if (dateInputs.length >= 2) {
      await dateInputs[0].fill(dateRange.startDate);
      await page.waitForTimeout(500);
      
      await dateInputs[1].fill(dateRange.endDate);
      await page.waitForTimeout(500);
      
      utils.writeLog(logFile, `✓ Date range set: ${dateRange.startDate} to ${dateRange.endDate}`, 'INFO');
      return true;
    } else {
      utils.writeLog(logFile, `Found only ${dateInputs.length} date input fields`, 'WARN');
    }
  } catch (error) {
    utils.writeLog(logFile, `Error setting date range: ${error.message}`, 'ERROR');
  }

  return false;
}

/**
 * Apply "Test Only" filter
 */
async function applyTestOnlyFilter(page, logFile) {
  utils.writeLog(logFile, 'Applying Test Only filter', 'INFO');

  try {
    let filterApplied = false;

    const selectors = [
      'input[value*="Test"][type="checkbox"]',
      'label:has-text("Test Only") input[type="checkbox"]',
      'input[id*="Test"][type="checkbox"]',
      'label:has-text("Test") input[type="checkbox"]'
    ];

    for (const selector of selectors) {
      try {
        const element = await page.locator(selector).first();
        if (await element.isVisible({ timeout: 2000 }).catch(() => false)) {
          const isChecked = await element.isChecked();
          if (!isChecked) {
            await element.check();
            await page.waitForTimeout(500);
            filterApplied = true;
            utils.writeLog(logFile, `✓ Applied Test Only filter using selector: ${selector}`, 'INFO');
            break;
          } else {
            filterApplied = true;
            utils.writeLog(logFile, `✓ Test Only filter already applied`, 'INFO');
            break;
          }
        }
      } catch (e) {
      }
    }

    if (!filterApplied) {
      utils.writeLog(logFile, 'Could not apply Test Only filter - checking page state', 'WARN');
    }

    await page.waitForTimeout(2000);
    
    const screenshotPath = await utils.captureScreenshot(
      page,
      `01_after_test_only_filter_${Date.now()}.png`,
      CONFIG.SCREENSHOT_DIR
    );
    utils.writeLog(logFile, `Screenshot: ${screenshotPath}`, 'INFO');

    return true;
  } catch (error) {
    utils.writeLog(logFile, `Error applying Test Only filter: ${error.message}`, 'ERROR');
    return false;
  }
}

/**
 * Click Run Report button
 */
async function runReport(page, logFile) {
  utils.writeLog(logFile, 'Running report', 'INFO');
  
  try {
    const runButtonSelectors = [
      'button:has-text("Run Report")',
      'input[type="submit"][value*="Run"]',
      '[role="button"]:has-text("Run")'
    ];
    
    for (const selector of runButtonSelectors) {
      try {
        const runButton = page.locator(selector).first();
        if (await runButton.isVisible({ timeout: 3000 }).catch(() => false)) {
          await runButton.click();
          await page.waitForTimeout(5000);
          utils.writeLog(logFile, '✓ Report executed successfully', 'INFO');
          return true;
        }
      } catch (e) {
      }
    }
    
    utils.writeLog(logFile, '⚠ Could not find Run Report button - assuming report auto-runs', 'WARN');
    return true;
  } catch (error) {
    utils.writeLog(logFile, `Error running report: ${error.message}`, 'ERROR');
    return false;
  }
}

/**
 * Extract records and COUNT IP OCCURRENCES across all pages
 */
async function extractAndCountIPs(page, logFile) {
  utils.writeLog(logFile, 'Extracting records and counting IP occurrences', 'INFO');

  const ipCounts = new Map();
  const ipLeadMap = new Map();
  
  try {
    const gridSelector = 'table, [role="grid"], [role="table"]';
    const gridElement = await page.locator(gridSelector).first();

    if (await gridElement.isVisible({ timeout: 5000 }).catch(() => false)) {
      utils.writeLog(logFile, '✓ Conversion grid found', 'INFO');

      let hasNextPage = true;
      let pageNumber = 1;
      
      while (hasNextPage) {
        utils.writeLog(logFile, `Processing page ${pageNumber}`, 'INFO');
        
        await page.waitForTimeout(1000);
        
        const rows = await page.locator(gridSelector + ' tr, [role="row"]').all();
        utils.writeLog(logFile, `Found ${rows.length} rows on page ${pageNumber}`, 'INFO');

        for (let i = 0; i < rows.length; i++) {
          try {
            const rowText = await rows[i].textContent();
            
            const ipMatches = rowText.match(/\b(?:\d{1,3}\.){3}\d{1,3}\b/g);
            if (ipMatches) {
              for (const ip of ipMatches) {
                ipCounts.set(ip, (ipCounts.get(ip) || 0) + 1);
                
                if (!ipLeadMap.has(ip)) {
                  const leadIdMatch = rowText.match(/\b\d{7,12}\b/);
                  if (leadIdMatch) {
                    ipLeadMap.set(ip, leadIdMatch[0]);
                  }
                }
              }
            }

          } catch (e) {
          }
        }

        // Check for next page button
        const nextPageSelectors = [
          'a:has-text("Next"), button:has-text("Next")',
          '[aria-label="Next page"]',
          '.pagination-next'
        ];
        
        hasNextPage = false;
        for (const selector of nextPageSelectors) {
          try {
            const nextButton = page.locator(selector).first();
            if (await nextButton.isVisible({ timeout: 1000 }).catch(() => false)) {
              await nextButton.click();
              await page.waitForTimeout(2000);
              hasNextPage = true;
              pageNumber++;
              break;
            }
          } catch (e) {
          }
        }
      }

      // Convert Map to object for easier handling
      const ipCountsObject = {};
      ipCounts.forEach((count, ip) => {
        ipCountsObject[ip] = count;
      });

      utils.writeLog(logFile, `✓ Processed ${pageNumber} pages total`, 'INFO');
      utils.writeLog(logFile, `✓ Found ${ipCounts.size} unique IP addresses`, 'INFO');
      
      for (const [ip, count] of ipCounts) {
        utils.writeLog(logFile, `  IP: ${ip} : ${count} occurrences`, 'INFO');
      }

      return {
        ipCounts: ipCountsObject,
        ipLeadMap: Object.fromEntries(ipLeadMap),
        totalPages: pageNumber
      };
    }
  } catch (error) {
    utils.writeLog(logFile, `Error extracting and counting IPs: ${error.message}`, 'ERROR');
  }

  return {
    ipCounts: {},
    ipLeadMap: {},
    totalPages: 0
  };
}

/**
 * Open Lead ID record
 */
async function openLeadRecord(page, leadId, logFile) {
  utils.writeLog(logFile, `Opening Lead ID: ${leadId}`, 'INFO');

  try {
    // Search for lead ID in grid
    const gridSelector = 'table tr, [role="row"]';
    const rows = await page.locator(gridSelector).all();

    for (const row of rows) {
      const rowText = await row.textContent();
      if (rowText.includes(leadId)) {
        const clickableElement = await row.locator('a, [role="button"]').first();
        if (clickableElement) {
          await clickableElement.click();
          
          await page.waitForNavigation({ waitUntil: 'domcontentloaded', timeout: 8000 }).catch(() => {});
          await page.waitForTimeout(1500);

          utils.writeLog(logFile, `✓ Opened record for Lead ID: ${leadId}`, 'INFO');
          return true;
        }
      }
    }

    utils.writeLog(logFile, `Could not find clickable element for Lead ID: ${leadId}`, 'WARN');
    return false;
  } catch (error) {
    utils.writeLog(logFile, `Error opening Lead ID record: ${error.message}`, 'ERROR');
    return false;
  }
}

/**
 * Extract test user information from the record
 */
async function extractTestUserInfo(page, logFile) {
  utils.writeLog(logFile, 'Extracting test user information', 'INFO');

  const extracted = {
    firstName: null,
    lastName: null,
    email: null,
    isTestChecked: false
  };

  try {
    const fieldPatterns = {
      firstName: [
        'input[name*="first"], input[placeholder*="First"], input[id*="FirstName"], input[id*="first"]',
        'label:has-text("First") + input, label:has-text("First Name") + input'
      ],
      lastName: [
        'input[name*="last"], input[placeholder*="Last"], input[id*="LastName"], input[id*="last"]',
        'label:has-text("Last") + input, label:has-text("Last Name") + input'
      ],
      email: [
        'input[type="email"], input[name*="email"], input[placeholder*="Email"], input[id*="email"]',
        'label:has-text("Email") + input'
      ]
    };

    for (const [field, selectors] of Object.entries(fieldPatterns)) {
      for (const selector of selectors) {
        try {
          const elements = await page.locator(selector).all();
          if (elements.length > 0) {
            const value = await elements[0].inputValue();
            if (value && value.trim()) {
              extracted[field] = value.trim();
              utils.writeLog(logFile, `Found ${field}: ${value}`, 'INFO');
              break;
            }
          }
        } catch (e) {
        }
      }
    }

    // Check Is Test checkbox
    const testCheckboxSelectors = [
      'input[type="checkbox"][name*="test"], input[type="checkbox"][id*="test"]',
      'label:has-text("Is Test") input[type="checkbox"]',
      'label:has-text("Test") input[type="checkbox"]'
    ];

    for (const selector of testCheckboxSelectors) {
      try {
        const checkbox = page.locator(selector).first();
        if (await checkbox.isVisible({ timeout: 1000 }).catch(() => false)) {
          extracted.isTestChecked = await checkbox.isChecked();
          utils.writeLog(logFile, `Is Test checkbox: ${extracted.isTestChecked ? 'CHECKED' : 'UNCHECKED'}`, 'INFO');
          break;
        }
      } catch (e) {
      }
    }

    return extracted;
  } catch (error) {
    utils.writeLog(logFile, `Error extracting user info: ${error.message}`, 'ERROR');
    return extracted;
  }
}

/**
 * Validate extracted information against expected test user
 */
function validateTestUser(extracted, logFile) {
  utils.writeLog(logFile, 'Validating test user information', 'INFO');

  const validation = {
    isValid: true,
    isTestValid: extracted.isTestChecked,
    nameEmailValid: true,
    mismatches: [],
    extracted: extracted
  };

  // Validate name and email
  for (const [field, expectedValue] of Object.entries(CONFIG.TEST_USER_INFO)) {
    const extractedValue = extracted[field];
    
    if (extractedValue === expectedValue) {
      utils.writeLog(logFile, `✓ ${field} matches: "${extractedValue}"`, 'INFO');
    } else {
      validation.isValid = false;
      validation.nameEmailValid = false;
      validation.mismatches.push({
        field: field,
        expected: expectedValue,
        extracted: extractedValue
      });
      utils.writeLog(logFile, `✗ ${field} MISMATCH - Expected: "${expectedValue}", Got: "${extractedValue}"`, 'ERROR');
    }
  }

  // Validate Is Test checkbox
  if (!extracted.isTestChecked) {
    validation.isValid = false;
    utils.writeLog(logFile, `✗ Is Test checkbox is NOT checked`, 'ERROR');
  } else {
    utils.writeLog(logFile, `✓ Is Test checkbox is properly checked`, 'INFO');
  }

  return validation;
}

/**
 * Append data to Google Sheet "Test Only IP Data" tab
 */
async function appendToGoogleSheet(validationResults, logFile) {
  utils.writeLog(logFile, 'Appending data to Google Sheet', 'INFO');

  try {
    const auth = new google.auth.GoogleAuth({
      keyFile: process.env.GOOGLE_SERVICE_ACCOUNT_FILE || '../service-account-creds.json',
      scopes: ['https://www.googleapis.com/auth/spreadsheets']
    });
    
    const client = await auth.getClient();
    const sheets = google.sheets({ version: 'v4', auth: client });
    const spreadsheetId = CONFIG.GOOGLE_SHEET_ID;
    const sheetName = CONFIG.SHEET_TAB_NAME;

    // Check if sheet exists and has headers
    let sheetExists = true;
    let headers = [];
    
    try {
      const res = await sheets.spreadsheets.values.get({
        spreadsheetId,
        range: `${sheetName}!A1:E1`
      });
      headers = res.data.values && res.data.values[0] ? res.data.values[0] : [];
    } catch (e) {
      sheetExists = false;
    }

    // Create sheet if it doesn't exist
    if (!sheetExists) {
      utils.writeLog(logFile, `Creating new sheet: ${sheetName}`, 'INFO');
      
      await sheets.spreadsheets.batchUpdate({
        spreadsheetId,
        requestBody: {
          requests: [{
            addSheet: {
              properties: {
                title: sheetName,
                gridProperties: {
                  rowCount: 1000,
                  columnCount: 5,
                  frozenRowCount: 1
                }
              }
            }
          }]
        }
      });
    }

    // Create headers if missing
    const expectedHeaders = ['Date', 'Lead ID', 'IP & IP Count', 'IS Test', 'Name & Email Validation'];
    
    if (headers.length < 5 || headers[0] !== expectedHeaders[0]) {
      utils.writeLog(logFile, 'Creating headers in sheet', 'INFO');
      
      await sheets.spreadsheets.values.update({
        spreadsheetId,
        range: `${sheetName}!A1:E1`,
        valueInputOption: 'USER_ENTERED',
        requestBody: {
          values: [expectedHeaders]
        }
      });
    }

    // Prepare rows to append
    const currentDate = new Date().toLocaleDateString();
    const rows = [];

    for (const result of validationResults) {
      rows.push([
        currentDate,
        result.leadId,
        `${result.ip} : ${result.count}`,
        result.isTestValid ? 'True' : 'False',
        result.nameEmailValid ? 'Correct' : 'Incorrect'
      ]);
    }

    // Append rows
    if (rows.length > 0) {
      await sheets.spreadsheets.values.append({
        spreadsheetId,
        range: `${sheetName}!A:E`,
        valueInputOption: 'USER_ENTERED',
        requestBody: {
          values: rows
        }
      });

      utils.writeLog(logFile, `✓ Appended ${rows.length} rows to Google Sheet`, 'INFO');
      return true;
    }

  } catch (error) {
    utils.writeLog(logFile, `Error appending to Google Sheet: ${error.message}`, 'ERROR');
  }

  return false;
}

/**
 * Main execution flow
 */
async function runTestOnlyValidation() {
  console.log('='.repeat(60));
  console.log('FLM Agent - Cake Test Only Validation Process - UPDATED');
  console.log('='.repeat(60));
  console.log('');

  // Setup
  ensureDirectories();
  const logFile = setupLogging();
  const startTime = Date.now();
  
  utils.writeLog(logFile, 'Cake Test Only Validation Process Started', 'INFO');

  let browser;
  const validationResults = [];

  try {
    // Launch browser
    utils.writeLog(logFile, 'Launching browser', 'INFO');
    const isHeaded = process.argv.includes('--headed');
    browser = await utils.launchBrowser(isHeaded);
    
    const context = await browser.newContext({
      storageState: fs.existsSync(CONFIG.AUTH_STATE_PATH) ? CONFIG.AUTH_STATE_PATH : undefined
    });
    const page = await context.newPage();

    // Navigate to Cake
    utils.writeLog(logFile, 'Navigating to Cake CRM', 'INFO');
    await utils.navigateToCake(page);
    await page.waitForTimeout(3000);

    // Handle login
    const loginSuccess = await handleLogin(page, logFile);
    if (!loginSuccess) {
      utils.writeLog(logFile, 'Login handling failed', 'ERROR');
      throw new Error('Could not handle login');
    }

    // Navigate to Conversions
    const navigated = await navigateToConversions(page, logFile);
    if (!navigated) {
      throw new Error('Failed to navigate to Conversions page');
    }

    // Set date range
    await setDateRange(page, logFile);
    await page.waitForTimeout(1000);

    // Apply Test Only filter
    await applyTestOnlyFilter(page, logFile);

    // Run report
    await runReport(page, logFile);
    await page.waitForTimeout(3000);

    // Extract and count IPs across all pages
    const ipData = await extractAndCountIPs(page, logFile);

    // Select up to 3 unique IPs
    const uniqueIPs = Object.keys(ipData.ipCounts);
    const selectedIPs = uniqueIPs.slice(0, Math.min(3, uniqueIPs.length));
    
    utils.writeLog(logFile, `Selected ${selectedIPs.length} IP(s) for validation`, 'INFO');

    // Process each selected IP
    for (const ip of selectedIPs) {
      utils.writeLog(logFile, `Processing IP: ${ip}`, 'INFO');
      
      const leadId = ipData.ipLeadMap[ip];
      if (!leadId) {
        utils.writeLog(logFile, `No Lead ID found for IP: ${ip}`, 'WARN');
        continue;
      }

      // Open lead record
      const recordOpened = await openLeadRecord(page, leadId, logFile);
      
      if (recordOpened) {
        await page.waitForTimeout(2000);

        // Extract test user info
        const extracted = await extractTestUserInfo(page, logFile);

        // Validate
        const validation = validateTestUser(extracted, logFile);

        validationResults.push({
          ip: ip,
          count: ipData.ipCounts[ip],
          leadId: leadId,
          isTestValid: validation.isTestValid,
          nameEmailValid: validation.nameEmailValid,
          isValid: validation.isValid
        });

        // Go back to report page
        await page.goBack();
        await page.waitForTimeout(2000);
      }
    }

    // Append results to Google Sheet
    if (validationResults.length > 0) {
      await appendToGoogleSheet(validationResults, logFile);
    }

    // Final summary
    const duration = ((Date.now() - startTime) / 1000).toFixed(2);
    utils.writeLog(logFile, `Execution completed in ${duration} seconds`, 'INFO');
    utils.writeLog(logFile, `Processed ${validationResults.length} IP records`, 'INFO');

    console.log('');
    console.log('='.repeat(60));
    console.log(`Execution Report`);
    console.log('='.repeat(60));
    console.log(`Duration: ${duration}s`);
    console.log(`Unique IPs Found: ${uniqueIPs.length}`);
    console.log(`IPs Processed: ${validationResults.length}`);
    console.log(`Log File: ${logFile}`);
    console.log('='.repeat(60));
    console.log('');

  } catch (error) {
    utils.writeLog(logFile, `FATAL ERROR: ${error.message}`, 'ERROR');
    utils.writeLog(logFile, error.stack, 'ERROR');
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
runTestOnlyValidation().catch(error => {
  console.error('Unhandled error:', error);
  process.exit(1);
});
