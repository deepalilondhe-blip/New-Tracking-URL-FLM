const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');
const nodemailer = require('nodemailer');
require('dotenv').config({ path: path.resolve(__dirname, '..', '.env') });

// Configuration
const TEST_USER_INFO = {
  firstName: 'CKMTESTPIXEL',
  lastName: 'CKMTESTPIXEL',
  email: 'ckmtestpixel@gmail.com'
};

const DEVELOPER_EMAIL = process.env.DEVELOPER_EMAIL || 'urvish.patel@bytestechnolab.com';
const SCHEDULER_DATE_RANGE = getSchedulerDateRange();

// Get date range from scheduler or current date
function getSchedulerDateRange() {
  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);
  
  return {
    startDate: formatDate(yesterday),
    endDate: formatDate(today)
  };
}

function formatDate(date) {
  return date.toISOString().split('T')[0]; // YYYY-MM-DD
}

async function launchBrowser(preferHeaded = true) {
  const launchAttempts = preferHeaded
    ? [
        { headless: false, channel: 'chrome' },
        { headless: false },
        { headless: true, channel: 'chrome' },
        { headless: true }
      ]
    : [
        { headless: true, channel: 'chrome' },
        { headless: false, channel: 'chrome' },
        { headless: true },
        { headless: false }
      ];

  let lastError;
  for (const options of launchAttempts) {
    try {
      console.log('Trying browser launch with options:', options);
      return await chromium.launch(options);
    } catch (error) {
      lastError = error;
      console.warn(`Launch attempt failed (${error.message})`);
    }
  }

  throw lastError;
}

async function sendEmail(subject, body, attachments = []) {
  try {
    const transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS
      }
    });

    const mailOptions = {
      from: process.env.EMAIL_USER,
      to: DEVELOPER_EMAIL,
      subject: `[FLM Verification] ${subject}`,
      html: body,
      attachments: attachments
    };

    await transporter.sendMail(mailOptions);
    console.log(`✓ Email sent to ${DEVELOPER_EMAIL}`);
  } catch (error) {
    console.error('Email sending failed:', error.message);
  }
}

async function captureScreenshot(page, filename) {
  const screenshotPath = path.join(__dirname, 'verification_screenshots', filename);
  const dir = path.dirname(screenshotPath);
  
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  
  await page.screenshot({ path: screenshotPath });
  return screenshotPath;
}

async function navigateToReports(page) {
  console.log('Navigating to Cake login page...');
  await page.goto('https://app.forwardleapmarketing.com/newrep.aspx', { waitUntil: 'networkidle' });

  // Check if already logged in
  const loginForm = await page.$('input[type="password"]');
  if (!loginForm) {
    console.log('Already logged in. Proceeding to Reports...');
    return;
  }

  // Login if needed (manual or automated)
  console.log('Login required. Please log in manually or provide credentials.');
}

async function applyTestOnlyFilter(page) {
  console.log('Applying Test Only filter...');
  
  try {
    // Click REPORTS
    await page.click('a:has-text("REPORTS")');
    await page.waitForTimeout(1000);

    // Click Conversions
    await page.click('a:has-text("Conversions")');
    await page.waitForTimeout(1000);

    // Set date range
    console.log(`Setting date range: ${SCHEDULER_DATE_RANGE.startDate} to ${SCHEDULER_DATE_RANGE.endDate}`);
    
    const startDateInput = await page.$('input[placeholder*="Start Date"], input[id*="StartDate"]');
    const endDateInput = await page.$('input[placeholder*="End Date"], input[id*="EndDate"]');
    
    if (startDateInput) await startDateInput.fill(SCHEDULER_DATE_RANGE.startDate);
    if (endDateInput) await endDateInput.fill(SCHEDULER_DATE_RANGE.endDate);
    
    await page.waitForTimeout(500);

    // Apply Test Only filter
    const testOnlyCheckbox = await page.$('input[type="checkbox"][value*="Test"], label:has-text("Test Only") input');
    if (testOnlyCheckbox) {
      await testOnlyCheckbox.check();
      console.log('✓ Test Only filter applied');
    }

    await page.waitForTimeout(1000);
  } catch (error) {
    console.error('Error applying Test Only filter:', error.message);
  }
}

async function searchAndExtractIPAddresses(page) {
  console.log('Using Ctrl+F to search for IP addresses...');
  
  const ips = new Set();
  const ipRecords = [];

  try {
    // Get all rows from the conversion grid
    const rows = await page.$$('table tr, [role="row"]');
    console.log(`Found ${rows.length} rows in conversion grid`);

    for (const row of rows) {
      const cells = await row.$$('td, [role="cell"]');
      for (const cell of cells) {
        const text = await cell.textContent();
        
        // Extract IP addresses (simple regex for IPv4)
        const ipMatch = text.match(/\b(?:\d{1,3}\.){3}\d{1,3}\b/g);
        if (ipMatch) {
          for (const ip of ipMatch) {
            ips.add(ip);
            ipRecords.push({
              ip: ip,
              rowElement: row
            });
          }
        }
      }
    }

    console.log(`✓ Extracted ${ips.size} unique IP addresses`);
    return Array.from(ips);
  } catch (error) {
    console.error('Error extracting IP addresses:', error.message);
    return [];
  }
}

async function verifyIPConsistency(ips) {
  console.log(`Validating IP count: ${ips.length} unique IPs`);
  
  if (ips.length === 0) {
    console.log('No IP addresses found in test records');
    return { isValid: false, message: 'No IPs found' };
  }

  if (ips.length === 1) {
    console.log(`✓ Single consistent IP found: ${ips[0]}`);
    return { isValid: true, ips: ips };
  }

  console.log(`Found ${ips.length} different IP addresses:`, ips);
  return { isValid: false, ips: ips, message: `Multiple IPs detected: ${ips.join(', ')}` };
}

async function openUniqueIDRecord(page, ip) {
  console.log(`Opening Unique ID record for IP: ${ip}`);
  
  try {
    // Find and click the row containing this IP
    const rows = await page.$$('table tr, [role="row"]');
    
    for (const row of rows) {
      const text = await row.textContent();
      if (text.includes(ip)) {
        // Click on the row or unique ID link
        const uniqueIdLink = await row.$('a[href*="unique"], a[href*="id"]');
        if (uniqueIdLink) {
          await uniqueIdLink.click();
          await page.waitForNavigation({ waitUntil: 'networkidle' });
          console.log('✓ Unique ID record opened');
          return true;
        }
        break;
      }
    }
  } catch (error) {
    console.error('Error opening Unique ID record:', error.message);
  }
  
  return false;
}

async function extractTestUserDetails(page) {
  console.log('Extracting test user details...');
  
  const extractedData = {
    firstName: null,
    lastName: null,
    email: null
  };

  try {
    // Common selectors for form fields
    const selectors = {
      firstName: ['input[name*="first"], input[placeholder*="First"], input[id*="First"]'],
      lastName: ['input[name*="last"], input[placeholder*="Last"], input[id*="Last"]'],
      email: ['input[name*="email"], input[type="email"], input[placeholder*="Email"]']
    };

    for (const [field, fieldSelectors] of Object.entries(selectors)) {
      for (const selector of fieldSelectors[0].split(',')) {
        const element = await page.$(selector.trim());
        if (element) {
          const value = await element.inputValue();
          if (value) {
            extractedData[field] = value;
            break;
          }
        }
      }
    }

    console.log('Extracted data:', extractedData);
    return extractedData;
  } catch (error) {
    console.error('Error extracting test user details:', error.message);
    return extractedData;
  }
}

async function validateUserDetails(extractedData) {
  console.log('Validating user details against expected values...');
  
  const mismatches = [];
  const validationResult = {
    isValid: true,
    mismatches: [],
    extractedData: extractedData
  };

  for (const [field, expectedValue] of Object.entries(TEST_USER_INFO)) {
    const extractedValue = extractedData[field];
    if (extractedValue !== expectedValue) {
      mismatches.push({
        field: field,
        expected: expectedValue,
        extracted: extractedValue
      });
      validationResult.isValid = false;
      console.log(`✗ Mismatch in ${field}: expected "${expectedValue}", got "${extractedValue}"`);
    } else {
      console.log(`✓ ${field} matches correctly`);
    }
  }

  validationResult.mismatches = mismatches;
  return validationResult;
}

async function extractLeadID(page) {
  console.log('Extracting Lead ID...');
  
  try {
    const leadIdSelectors = ['input[name*="lead"], input[id*="LeadId"], span:has-text("Lead ID") + span'];
    
    for (const selector of leadIdSelectors) {
      const element = await page.$(selector);
      if (element) {
        const value = await element.getAttribute('value') || await element.textContent();
        if (value) {
          console.log(`✓ Lead ID extracted: ${value}`);
          return value;
        }
      }
    }
  } catch (error) {
    console.error('Error extracting Lead ID:', error.message);
  }
  
  return null;
}

async function generateReport(results) {
  const timestamp = new Date().toISOString();
  const reportPath = path.join(__dirname, `verification_report_${Date.now()}.json`);
  
  const report = {
    timestamp: timestamp,
    dateRange: SCHEDULER_DATE_RANGE,
    totalTests: results.length,
    passedTests: results.filter(r => r.isValid).length,
    failedTests: results.filter(r => !r.isValid).length,
    mismatches: results.filter(r => !r.isValid),
    details: results
  };

  fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
  console.log(`✓ Report saved to: ${reportPath}`);
  
  return report;
}

async function notifyDeveloper(failedResults) {
  if (failedResults.length === 0) {
    console.log('No failures to report');
    return;
  }

  const failedLeadIds = failedResults.map(r => r.leadId).filter(Boolean);
  const mismatchDetails = failedResults.map(r => ({
    ip: r.ip,
    leadId: r.leadId,
    mismatches: r.mismatches
  }));

  const emailBody = `
    <h2>FLM Verification Report</h2>
    <p><strong>Execution Time:</strong> ${new Date().toISOString()}</p>
    <p><strong>Date Range:</strong> ${SCHEDULER_DATE_RANGE.startDate} to ${SCHEDULER_DATE_RANGE.endDate}</p>
    
    <h3>Failed Validations: ${failedResults.length}</h3>
    
    ${failedLeadIds.length > 0 ? `
      <h4>Failed Lead IDs:</h4>
      <ul>
        ${failedLeadIds.map(id => `<li>${id}</li>`).join('')}
      </ul>
    ` : ''}
    
    <h4>Detailed Mismatches:</h4>
    <pre>${JSON.stringify(mismatchDetails, null, 2)}</pre>
    
    <p>Please investigate these records for test user validation failures.</p>
  `;

  await sendEmail('Test User Validation Failures', emailBody);
}

async function runVerification() {
  let browser;
  const allResults = [];

  try {
    console.log('=== FLM Agent – Cake Verification Process ===');
    console.log(`Date Range: ${SCHEDULER_DATE_RANGE.startDate} to ${SCHEDULER_DATE_RANGE.endDate}`);
    console.log('');

    browser = await launchBrowser(process.argv.includes('--headed'));
    const context = await browser.newContext({
      storageState: path.join(__dirname, 'cake-auth-state.json')
    });
    const page = await context.newPage();

    // Navigate to reports
    await navigateToReports(page);
    await page.waitForTimeout(2000);

    // Apply Test Only filter
    await applyTestOnlyFilter(page);
    await page.waitForTimeout(2000);

    // Screenshot after filter
    await captureScreenshot(page, 'after_filter_applied.png');

    // Extract IP addresses
    const ips = await searchAndExtractIPAddresses(page);
    const ipValidation = await verifyIPConsistency(ips);

    // Process each IP
    for (const ip of ips) {
      console.log(`\n--- Processing IP: ${ip} ---`);
      
      const recordOpened = await openUniqueIDRecord(page, ip);
      if (!recordOpened) {
        console.log(`Could not open record for IP: ${ip}`);
        continue;
      }

      await page.waitForTimeout(2000);

      // Extract user details
      const extractedData = await extractTestUserDetails(page);
      
      // Validate
      const validationResult = await validateUserDetails(extractedData);
      
      // Extract Lead ID if validation failed
      let leadId = null;
      if (!validationResult.isValid) {
        leadId = await extractLeadID(page);
        await captureScreenshot(page, `failure_ip_${ip}_leadid_${leadId}.png`);
      }

      const result = {
        ip: ip,
        isValid: validationResult.isValid,
        extractedData: extractedData,
        mismatches: validationResult.mismatches,
        leadId: leadId
      };

      allResults.push(result);

      // Go back to conversion grid
      await page.goBack();
      await page.waitForTimeout(1000);
    }

    // Generate report
    const report = await generateReport(allResults);

    // Notify developer if there are failures
    const failedResults = allResults.filter(r => !r.isValid);
    if (failedResults.length > 0) {
      console.log(`\n⚠ ${failedResults.length} validation failures detected. Notifying developer...`);
      await notifyDeveloper(failedResults);
    } else {
      console.log('\n✓ All validations passed!');
    }

    console.log(`\n=== Verification Complete ===`);
    console.log(`Passed: ${report.passedTests}/${report.totalTests}`);
    console.log(`Failed: ${report.failedTests}/${report.totalTests}`);

  } catch (error) {
    console.error('Verification process failed:', error.message);
    process.exit(1);
  } finally {
    if (browser) {
      await browser.close();
    }
  }
}

// Run verification
runVerification();
