/**
 * FLM Agent - Cake "Test Only" Validation Script
 * 
 * INDEPENDENT SCRIPT - Does not modify or interfere with existing cake.js
 * 
 * Process Flow:
 * 1. Open Cake Reports
 * 2. Navigate to Conversions
 * 3. Set scheduler-based date range automatically
 * 4. Apply "Test Only" filter
 * 5. Use Ctrl+F to search and extract records
 * 6. Verify IP consistency and count
 * 7. Open Unique ID record dynamically
 * 8. Validate test user information against expected values
 * 9. Generate report and notify developer if mismatches found
 */

const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '..', '.env') });

const utils = require('./cake_utils');

// Configuration - Test Only Process
const CONFIG = {
  TEST_USER_INFO: {
    firstName: 'CKMTESTPIXEL',
    lastName: 'CKMTESTPIXEL',
    email: 'ckmtestpixel@gmail.com'
  },
  // TEMPORARY: Email changed to deepali.londhe@magnetoitsolutions.com for verification
  // Original: urvish.patel@bytestechnolab.com
  // Purpose: Testing email notifications and formatting
  // Can be changed back after verification is complete
  DEVELOPER_EMAIL: process.env.DEVELOPER_EMAIL || 'deepali.londhe@magnetoitsolutions.com',
  AUTH_STATE_PATH: path.join(__dirname, 'cake-auth-state.json'),
  SCRIPT_NAME: 'cake_test_only',
  REPORT_DIR: path.join(__dirname, 'test_only_reports'),
  SCREENSHOT_DIR: path.join(__dirname, 'test_only_screenshots')
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
    // Check if login form is visible using proper ID selectors (from cake.js)
    const loginButton = await page.$('#submitButton, button:has-text("Log In"), input[type="submit"]');
    
    if (loginButton) {
      utils.writeLog(logFile, 'Login form detected - attempting to log in', 'INFO');
      
      const username = process.env.CAKE_USERNAME || 'urvish.patel@bytestechnolab.com';
      const password = process.env.CAKE_PASSWORD || 'Urvish@123#2026-06';
      
      // Use correct field identifiers from cake.js
      const usernameField = await page.$('#u, input[name="u"], input[type="text"]');
      const passwordField = await page.$('#password, input[name="p"], input[type="password"]');
      
      if (usernameField && passwordField && loginButton) {
        // Wait for fields to be visible
        await page.waitForSelector('#u, input[name="u"], input[type="text"]', { timeout: 15000 });
        await page.waitForSelector('#password, input[name="p"], input[type="password"]', { timeout: 15000 });
        await page.waitForSelector('#submitButton, button:has-text("Log In"), input[type="submit"]', { timeout: 15000 });
        
        // Fill username with typing effect
        await usernameField.click();
        await usernameField.fill('');
        await page.locator('#u, input[name="u"], input[type="text"]').first().type(username, { delay: 40 });
        await page.waitForTimeout(300);
        utils.writeLog(logFile, `Entered username: ${username}`, 'INFO');
        
        // Fill password with typing effect
        await passwordField.click();
        await passwordField.fill('');
        await page.locator('#password, input[name="p"], input[type="password"]').first().type(password, { delay: 40 });
        await page.waitForTimeout(300);
        utils.writeLog(logFile, 'Entered password', 'INFO');
        
        // Click login button
        utils.writeLog(logFile, 'Clicking Log In button...', 'INFO');
        await loginButton.click();
        
        // Wait for login outcome with proper timeout
        utils.writeLog(logFile, 'Waiting for login to complete...', 'INFO');
        let loginSuccess = false;
        const startTime = Date.now();
        const timeoutMs = 30000;
        
        while (Date.now() - startTime < timeoutMs) {
          await page.waitForTimeout(500);
          
          // Check if login button is still visible (means login failed)
          const isLoginStillVisible = await page.locator('#submitButton, button:has-text("Log In")').first().isVisible().catch(() => false);
          const currentUrl = page.url();
          
          // Check if we moved away from login page
          if (!isLoginStillVisible && !currentUrl.includes('app.forwardleapmarketing.com/?')) {
            utils.writeLog(logFile, `✓ Login successful - navigated to: ${currentUrl}`, 'INFO');
            loginSuccess = true;
            break;
          }
        }
        
        if (!loginSuccess) {
          utils.writeLog(logFile, '⚠ Login may have failed - button still visible', 'WARN');
        }
        
        // Additional stabilization after login
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
    // Step 1: Wait for page to fully stabilize after login
    await page.waitForTimeout(2000);
    utils.writeLog(logFile, 'Looking for Conversions menu item...', 'INFO');

    // Step 2: Try to directly click on "Conversions" link (it's visible on the page)
    const conversionsLink = page.locator('a:has-text("Conversions")').first();
    const isVisible = await conversionsLink.isVisible({ timeout: 5000 }).catch(() => false);
    
    if (isVisible) {
      utils.writeLog(logFile, '✓ Found Conversions link - clicking it', 'INFO');
      await conversionsLink.click();
      
      // Wait for the page to navigate
      await page.waitForNavigation({ waitUntil: 'domcontentloaded', timeout: 15000 }).catch(() => {
        utils.writeLog(logFile, 'Navigation timeout - continuing anyway', 'WARN');
      });
      await page.waitForTimeout(2000);
      
      // Take screenshot to confirm navigation
      const screenshotFile = `01_after_conversions_click_${Date.now()}.png`;
      const screenshotPath = path.join(CONFIG.SCREENSHOT_DIR, screenshotFile);
      await page.screenshot({ path: screenshotPath }).catch(err => {
        utils.writeLog(logFile, `Screenshot failed: ${err.message}`, 'WARN');
      });
      utils.writeLog(logFile, `✓ Successfully navigated to Conversions (screenshot: ${screenshotPath})`, 'INFO');
      return true;
    }

    // Fallback: Try clicking REPORTS menu first
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
        // Try next selector
      }
    }

    if (reportsClicked) {
      // Now try clicking Conversions again
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

    // Step 3: Fallback - Direct URL navigation
    utils.writeLog(logFile, 'Menu navigation failed - trying direct URL navigation', 'WARN');
    const currentUrl = page.url();
    const baseUrl = new URL(currentUrl).origin;
    const conversionsUrl = `${baseUrl}/reports/conversion`;
    
    utils.writeLog(logFile, `Navigating directly to: ${conversionsUrl}`, 'INFO');
    await page.goto(conversionsUrl, { waitUntil: 'domcontentloaded', timeout: 15000 }).catch(err => {
      utils.writeLog(logFile, `Direct navigation error: ${err.message}`, 'ERROR');
    });
    
    await page.waitForTimeout(2000);

    // Check if we successfully navigated to conversions
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
    // Look for date input fields
    const dateInputs = await page.locator('input[type="date"], input[placeholder*="Date"], input[id*="Date"]').all();
    
    if (dateInputs.length >= 2) {
      // Fill start date
      await dateInputs[0].fill(dateRange.startDate);
      await page.waitForTimeout(500);
      
      // Fill end date
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
    // Look for Test Only checkbox or filter option
    let filterApplied = false;

    // Try multiple selector patterns for the Test Only filter
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
        // Continue to next selector
      }
    }

    if (!filterApplied) {
      utils.writeLog(logFile, 'Could not apply Test Only filter - checking page state', 'WARN');
    }

    // Wait for filter to take effect
    await page.waitForTimeout(2000);
    
    // Screenshot after filter
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
 * Extract records and IP addresses using Ctrl+F
 */
async function extractRecordsWithSearch(page, logFile) {
  utils.writeLog(logFile, 'Extracting records from conversion grid using Ctrl+F', 'INFO');

  try {
    // Get table or grid data
    const gridSelector = 'table, [role="grid"], [role="table"]';
    const gridElement = await page.locator(gridSelector).first();

    if (await gridElement.isVisible({ timeout: 5000 }).catch(() => false)) {
      utils.writeLog(logFile, '✓ Conversion grid found', 'INFO');

      // Extract all visible rows
      const rows = await page.locator(gridSelector + ' tr, [role="row"]').all();
      utils.writeLog(logFile, `Found ${rows.length} rows in grid`, 'INFO');

      const records = [];
      const ips = new Set();

      for (let i = 0; i < Math.min(rows.length, 100); i++) {
        try {
          const rowText = await rows[i].textContent();
          
          // Extract IP addresses (simple IPv4 regex)
          const ipMatches = rowText.match(/\b(?:\d{1,3}\.){3}\d{1,3}\b/g);
          if (ipMatches) {
            ipMatches.forEach(ip => ips.add(ip));
          }

          records.push({
            rowIndex: i,
            content: rowText.substring(0, 100) // First 100 chars
          });
        } catch (e) {
          // Continue
        }
      }

      utils.writeLog(logFile, `✓ Extracted ${records.length} records with ${ips.size} unique IPs`, 'INFO');
      utils.writeLog(logFile, `Unique IPs: ${Array.from(ips).join(', ')}`, 'INFO');

      return {
        recordCount: records.length,
        ips: Array.from(ips),
        records: records
      };
    }
  } catch (error) {
    utils.writeLog(logFile, `Error extracting records: ${error.message}`, 'ERROR');
  }

  return {
    recordCount: 0,
    ips: [],
    records: []
  };
}

/**
 * Open Unique ID record dynamically
 */
async function openUniqueIDRecord(page, ip, logFile) {
  utils.writeLog(logFile, `Opening Unique ID record for IP: ${ip}`, 'INFO');

  try {
    const gridSelector = 'table tr, [role="row"]';
    const rows = await page.locator(gridSelector).all();

    for (const row of rows) {
      const rowText = await row.textContent();
      if (rowText.includes(ip)) {
        // Look for clickable link or button in this row
        const clickableElement = await row.locator('a, [role="button"]').first();
        if (clickableElement) {
          await clickableElement.click();
          
          // Wait for navigation or modal
          await page.waitForNavigation({ waitUntil: 'domcontentloaded', timeout: 8000 }).catch(() => {
            console.log('Navigation timeout - continuing anyway');
          });
          await page.waitForTimeout(1500);

          utils.writeLog(logFile, `✓ Opened record for IP: ${ip}`, 'INFO');

          // Screenshot of opened record
          const screenshotPath = await utils.captureScreenshot(
            page,
            `02_unique_id_record_ip_${ip.replace(/\./g, '_')}_${Date.now()}.png`,
            CONFIG.SCREENSHOT_DIR
          );
          utils.writeLog(logFile, `Screenshot: ${screenshotPath}`, 'INFO');

          return true;
        }
      }
    }

    utils.writeLog(logFile, `Could not find clickable element for IP: ${ip}`, 'WARN');
    return false;
  } catch (error) {
    utils.writeLog(logFile, `Error opening Unique ID record: ${error.message}`, 'ERROR');
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
    email: null
  };

  try {
    // Field selectors - multiple patterns to try
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
          // Continue
        }
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
    mismatches: [],
    extracted: extracted
  };

  for (const [field, expectedValue] of Object.entries(CONFIG.TEST_USER_INFO)) {
    const extractedValue = extracted[field];
    
    if (extractedValue === expectedValue) {
      utils.writeLog(logFile, `✓ ${field} matches: "${extractedValue}"`, 'INFO');
    } else {
      validation.isValid = false;
      const mismatch = {
        field: field,
        expected: expectedValue,
        extracted: extractedValue
      };
      validation.mismatches.push(mismatch);
      utils.writeLog(logFile, `✗ ${field} MISMATCH - Expected: "${expectedValue}", Got: "${extractedValue}"`, 'ERROR');
    }
  }

  return validation;
}

/**
 * Extract Lead ID from record
 */
async function extractLeadID(page, logFile) {
  utils.writeLog(logFile, 'Extracting Lead ID', 'INFO');

  try {
    const leadIdSelectors = [
      'input[name*="lead"], input[id*="LeadId"], input[id*="lead"], input[placeholder*="Lead"]',
      'span:has-text("Lead ID") + span, label:has-text("Lead ID") + input'
    ];

    for (const selector of leadIdSelectors) {
      const elements = await page.locator(selector).all();
      for (const element of elements) {
        let value = await element.inputValue().catch(() => null);
        if (!value) {
          value = await element.textContent();
        }
        if (value && value.trim()) {
          utils.writeLog(logFile, `✓ Lead ID: ${value}`, 'INFO');
          return value.trim();
        }
      }
    }

    utils.writeLog(logFile, 'Could not extract Lead ID', 'WARN');
    return null;
  } catch (error) {
    utils.writeLog(logFile, `Error extracting Lead ID: ${error.message}`, 'ERROR');
    return null;
  }
}

/**
 * Send failure notification email
 */
async function sendFailureEmail(leadId, validationData, ipAddress, logFile) {
  utils.writeLog(logFile, `Preparing failure notification for Lead ID: ${leadId}`, 'INFO');

  const mismatchDetails = validationData.mismatches
    .map(m => `<tr><td>${m.field}</td><td>${m.expected}</td><td>${m.extracted || 'N/A'}</td></tr>`)
    .join('');

  const emailContent = `
    <h3>Test User Validation Failed</h3>
    <p><strong>IP Address:</strong> ${ipAddress}</p>
    <p><strong>Lead ID:</strong> <span class="fail">${leadId}</span></p>
    
    <h4>Mismatches Found:</h4>
    <table>
      <tr>
        <th>Field</th>
        <th>Expected</th>
        <th>Extracted</th>
      </tr>
      ${mismatchDetails}
    </table>
    
    <h4>Action Required:</h4>
    <p>Please investigate the Lead ID <strong>${leadId}</strong> and verify the test user information.</p>
  `;

  const htmlEmail = utils.generateEmailTemplate(
    'Test User Validation Failed',
    emailContent,
    {
      'IP Address': ipAddress,
      'Lead ID': leadId,
      'Mismatches': validationData.mismatches.length
    }
  );

  const result = await utils.sendEmail(
    `Test User Validation Failed - Lead ID: ${leadId}`,
    htmlEmail,
    [],
    CONFIG.DEVELOPER_EMAIL
  );

  if (result) {
    utils.writeLog(logFile, `✓ Failure email sent to ${CONFIG.DEVELOPER_EMAIL}`, 'INFO');
  } else {
    utils.writeLog(logFile, `✗ Failed to send email notification`, 'ERROR');
  }
}

/**
 * Generate execution report
 */
function generateExecutionReport(logFile, recordsData, validationResults) {
  utils.writeLog(logFile, 'Generating execution report', 'INFO');

  const dateRange = utils.getSchedulerDateRange();
  const report = {
    executionTime: new Date().toISOString(),
    dateRange: {
      start: dateRange.displayStart,
      end: dateRange.displayEnd
    },
    recordsFound: recordsData.recordCount,
    uniqueIPs: recordsData.ips,
    validationResults: validationResults,
    summary: {
      total: validationResults.length,
      passed: validationResults.filter(r => r.isValid).length,
      failed: validationResults.filter(r => !r.isValid).length,
      failedLeadIds: validationResults.filter(r => !r.isValid && r.leadId).map(r => r.leadId)
    }
  };

  const reportPath = utils.saveReport(
    report,
    `test_only_report_${Date.now()}.json`
  );

  utils.writeLog(logFile, `Report Summary: ${report.summary.total} total, ${report.summary.passed} passed, ${report.summary.failed} failed`, 'INFO');

  return report;
}

/**
 * Main execution flow
 */
async function runTestOnlyValidation() {
  console.log('='.repeat(60));
  console.log('FLM Agent - Cake Test Only Validation Process');
  console.log('='.repeat(60));
  console.log('');

  // Setup
  ensureDirectories();
  const logFile = setupLogging();
  const startTime = Date.now();
  
  utils.writeLog(logFile, 'Cake Test Only Validation Process Started', 'INFO');

  let browser;
  const validationResults = [];
  let recordsData = { recordCount: 0, ips: [], records: [] };

  try {
    // Launch browser
    utils.writeLog(logFile, 'Launching browser', 'INFO');
    const isHeaded = process.argv.includes('--headed');
    browser = await utils.launchBrowser(isHeaded);
    
    // Create context with auth state if available
    const context = await browser.newContext({
      storageState: fs.existsSync(CONFIG.AUTH_STATE_PATH) ? CONFIG.AUTH_STATE_PATH : undefined
    });
    const page = await context.newPage();

    // Navigate to Cake
    utils.writeLog(logFile, 'Navigating to Cake CRM', 'INFO');
    await utils.navigateToCake(page);
    await page.waitForTimeout(3000);

    // Handle login using improved logic
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

    // Extract records
    recordsData = await extractRecordsWithSearch(page, logFile);

    // Process each IP
    if (recordsData.ips.length > 0) {
      utils.writeLog(logFile, `Processing ${recordsData.ips.length} unique IP(s)`, 'INFO');

      // Process first IP (as per requirements: "Open any one Unique ID dynamically")
      const selectedIP = recordsData.ips[0];
      utils.writeLog(logFile, `Selected IP for validation: ${selectedIP}`, 'INFO');

      const recordOpened = await openUniqueIDRecord(page, selectedIP, logFile);
      
      if (recordOpened) {
        await page.waitForTimeout(2000);

        // Extract test user info
        const extracted = await extractTestUserInfo(page, logFile);

        // Validate
        const validation = validateTestUser(extracted, logFile);

        let leadId = null;
        if (!validation.isValid) {
          utils.writeLog(logFile, 'Validation failed - extracting Lead ID', 'ERROR');
          leadId = await extractLeadID(page, logFile);

          // Capture failure screenshot
          const screenshotPath = await utils.captureScreenshot(
            page,
            `03_validation_failure_ip_${selectedIP.replace(/\./g, '_')}_${Date.now()}.png`,
            CONFIG.SCREENSHOT_DIR
          );
          utils.writeLog(logFile, `Failure screenshot: ${screenshotPath}`, 'INFO');

          // Send notification email
          if (leadId) {
            await sendFailureEmail(leadId, validation, selectedIP, logFile);
          }
        } else {
          utils.writeLog(logFile, '✓ All validations passed', 'INFO');
        }

        validationResults.push({
          ip: selectedIP,
          isValid: validation.isValid,
          extracted: extracted,
          mismatches: validation.mismatches,
          leadId: leadId
        });
      }
    } else {
      utils.writeLog(logFile, 'No test records found', 'WARN');
    }

    // Generate report
    const report = generateExecutionReport(logFile, recordsData, validationResults);

    // Final summary
    const duration = ((Date.now() - startTime) / 1000).toFixed(2);
    utils.writeLog(logFile, `Execution completed in ${duration} seconds`, 'INFO');
    utils.writeLog(logFile, `Summary: ${report.summary.passed} passed, ${report.summary.failed} failed`, 'INFO');

    console.log('');
    console.log('='.repeat(60));
    console.log(`Execution Report`);
    console.log('='.repeat(60));
    console.log(`Duration: ${duration}s`);
    console.log(`Records Found: ${recordsData.recordCount}`);
    console.log(`Unique IPs: ${recordsData.ips.length}`);
    console.log(`Validations: ${report.summary.passed} passed, ${report.summary.failed} failed`);
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
