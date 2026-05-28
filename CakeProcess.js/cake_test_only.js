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
    // Check if login form is visible
    const loginForm = await page.$('input[type="password"], input[type="email"], input[placeholder*="Email"], input[placeholder*="Username"]');
    
    if (loginForm) {
      utils.writeLog(logFile, 'Login form detected - attempting to log in', 'INFO');
      
      const username = process.env.CAKE_USERNAME || 'urvish.patel@bytestechnolab.com';
      const password = process.env.CAKE_PASSWORD || 'Urvish@123#2026-05';
      
      // Try to find email/username input
      const emailInputSelectors = [
        'input[type="email"]',
        'input[placeholder*="Email"]',
        'input[placeholder*="Username"]',
        'input[id*="email"], input[id*="username"]'
      ];
      
      let emailInput = null;
      for (const selector of emailInputSelectors) {
        emailInput = await page.$(selector);
        if (emailInput) {
          utils.writeLog(logFile, `Found email input with selector: ${selector}`, 'INFO');
          break;
        }
      }
      
      if (emailInput) {
        await emailInput.fill(username);
        await page.waitForTimeout(500);
        utils.writeLog(logFile, `Filled username: ${username}`, 'INFO');
      }
      
      // Try to find password input
      const passwordInput = await page.$('input[type="password"]');
      if (passwordInput) {
        await passwordInput.fill(password);
        await page.waitForTimeout(500);
        utils.writeLog(logFile, 'Filled password', 'INFO');
      }
      
      // Try to find and click login button
      const loginButtonSelectors = [
        'button:has-text("Login")',
        'button:has-text("Sign In")',
        'button:has-text("Submit")',
        'button[type="submit"]'
      ];
      
      let loginClicked = false;
      for (const selector of loginButtonSelectors) {
        const button = await page.locator(selector).first();
        if (await button.isVisible({ timeout: 2000 }).catch(() => false)) {
          await button.click();
          await page.waitForTimeout(2000);
          utils.writeLog(logFile, 'Clicked login button', 'INFO');
          loginClicked = true;
          break;
        }
      }
      
      if (!loginClicked) {
        utils.writeLog(logFile, 'Could not find login button - trying Enter key', 'WARN');
        await page.press('input[type="password"]', 'Enter');
        await page.waitForTimeout(2000);
      }
      
      // Wait for navigation or page load
      try {
        await page.waitForNavigation({ waitUntil: 'networkidle', timeout: 15000 });
      } catch (e) {
        await page.waitForTimeout(3000);
      }
      
      utils.writeLog(logFile, '✓ Login completed', 'INFO');
      return true;
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
    // Wait for page to load
    await page.waitForTimeout(2000);
    
    // Click REPORTS menu
    await page.waitForSelector('a, [role="button"]', { timeout: 5000 });
    const reportLinks = await page.locator('a, [role="button"]').allTextContents();
    
    console.log('Available menu items:', reportLinks);
    
    // Try to find and click REPORTS
    const reportsLink = await page.locator('a:has-text("REPORTS"), [role="button"]:has-text("REPORTS")').first();
    if (await reportsLink.isVisible({ timeout: 3000 }).catch(() => false)) {
      await reportsLink.click();
      await page.waitForTimeout(1000);
      utils.writeLog(logFile, 'Clicked REPORTS menu', 'INFO');
    }

    // Try to find and click CONVERSIONS
    const conversionsLink = await page.locator('a:has-text("Conversions"), [role="button"]:has-text("Conversions"), a:has-text("CONVERSIONS")').first();
    if (await conversionsLink.isVisible({ timeout: 3000 }).catch(() => false)) {
      await conversionsLink.click();
      await page.waitForNavigation({ waitUntil: 'networkidle', timeout: 30000 }).catch(() => {});
      await page.waitForTimeout(2000);
      utils.writeLog(logFile, 'Clicked Conversions menu', 'INFO');
      return true;
    }

    utils.writeLog(logFile, 'Could not find Conversions menu item', 'WARN');
    return false;
  } catch (error) {
    utils.writeLog(logFile, `Navigation failed: ${error.message}`, 'ERROR');
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
          await page.waitForNavigation({ waitUntil: 'networkidle', timeout: 10000 }).catch(() => {});
          await page.waitForTimeout(2000);

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

    // Handle login
    utils.writeLog(logFile, 'Checking login status', 'INFO');
    const loginForm = await page.$('input[type="password"]');
    
    if (loginForm) {
      utils.writeLog(logFile, 'Login required - entering credentials', 'INFO');
      
      const username = process.env.CAKE_USERNAME || 'urvish.patel@bytestechnolab.com';
      const password = process.env.CAKE_PASSWORD || 'Urvish@123#2026-05';
      
      // Find and fill username
      const emailInputs = await page.$$('input[type="email"], input[type="text"]');
      if (emailInputs.length > 0) {
        await emailInputs[0].fill(username);
        utils.writeLog(logFile, `Entered username: ${username}`, 'INFO');
      }
      
      // Fill password
      await loginForm.fill(password);
      utils.writeLog(logFile, 'Entered password', 'INFO');
      
      // Click login button
      const loginBtn = await page.$('button[type="submit"], button:has-text("Login"), button:has-text("Sign In")');
      if (loginBtn) {
        await loginBtn.click();
        utils.writeLog(logFile, 'Clicked login button', 'INFO');
        
        try {
          await page.waitForNavigation({ waitUntil: 'networkidle', timeout: 20000 });
        } catch (e) {
          await page.waitForTimeout(3000);
        }
        utils.writeLog(logFile, '✓ Login completed', 'INFO');
      }
    } else {
      utils.writeLog(logFile, 'Already logged in', 'INFO');
    }
    
    await page.waitForTimeout(2000);

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
