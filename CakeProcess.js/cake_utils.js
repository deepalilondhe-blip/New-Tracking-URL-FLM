/**
 * Shared Utilities for Cake Automation Scripts
 * Common functions that can be reused across different Cake process scripts
 */

const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');
const nodemailer = require('nodemailer');
require('dotenv').config({ path: path.resolve(__dirname, '..', '.env') });

/**
 * Launch browser with fallback options
 */
async function launchBrowser(preferHeaded = false) {
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

/**
 * Get date range from scheduler or current date
 */
function getSchedulerDateRange() {
  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);

  return {
    startDate: formatDateForInput(yesterday),
    endDate: formatDateForInput(today),
    displayStart: formatDateDisplay(yesterday),
    displayEnd: formatDateDisplay(today)
  };
}

/**
 * Format date for input fields (MM/DD/YYYY format commonly used in web forms)
 */
function formatDateForInput(date) {
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  const year = date.getFullYear();
  return `${month}/${day}/${year}`;
}

/**
 * Format date for display (YYYY-MM-DD format)
 */
function formatDateDisplay(date) {
  return date.toISOString().split('T')[0];
}

/**
 * Capture screenshot and save to specified directory
 */
async function captureScreenshot(page, filename, subdir = 'screenshots') {
  const screenshotDir = path.isAbsolute(subdir) ? subdir : path.join(__dirname, subdir);
  const screenshotPath = path.join(screenshotDir, filename);

  if (!fs.existsSync(screenshotDir)) {
    fs.mkdirSync(screenshotDir, { recursive: true });
  }

  await page.screenshot({ path: screenshotPath });
  console.log(`Screenshot saved: ${screenshotPath}`);
  return screenshotPath;
}

/**
 * Send email notification
 */
async function sendEmail(subject, htmlBody, attachments = [], toEmail = null) {
  try {
    const recipient = toEmail || process.env.DEVELOPER_EMAIL || 'urvish.patel@bytestechnolab.com';

    const transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS
      }
    });

    const mailOptions = {
      from: process.env.EMAIL_USER,
      to: recipient,
      subject: `[FLM Automation] ${subject}`,
      html: htmlBody,
      attachments: attachments
    };

    const info = await transporter.sendMail(mailOptions);
    console.log(`✓ Email sent to ${recipient} (Message ID: ${info.messageId})`);
    return true;
  } catch (error) {
    console.error('Email sending failed:', error.message);
    return false;
  }
}

/**
 * Create log entry with timestamp
 */
function createLogEntry(message, level = 'INFO') {
  const timestamp = new Date().toISOString();
  return `[${timestamp}] [${level}] ${message}`;
}

/**
 * Write logs to file
 */
function writeLog(logFilePath, message, level = 'INFO') {
  const logEntry = createLogEntry(message, level);
  console.log(logEntry);
  
  try {
    fs.appendFileSync(logFilePath, logEntry + '\n');
  } catch (error) {
    console.error('Failed to write log:', error.message);
  }
}

/**
 * Save JSON report to file
 */
function saveReport(data, filename) {
  const reportPath = path.join(__dirname, filename);
  fs.writeFileSync(reportPath, JSON.stringify(data, null, 2));
  console.log(`✓ Report saved: ${reportPath}`);
  return reportPath;
}

/**
 * Navigate to Cake with authentication state
 */
async function navigateToCake(page, authStatePath = null) {
  console.log('Navigating to Cake CRM...');
  try {
    await page.goto('https://app.forwardleapmarketing.com/newrep.aspx', {
      waitUntil: 'domcontentloaded',
      timeout: 30000
    });
    console.log('✓ Successfully navigated to Cake CRM');
    return true;
  } catch (error) {
    console.error('Navigation failed:', error.message);
    // Fallback: wait a bit and continue anyway
    await page.waitForTimeout(2000);
    return true;
  }
}

/**
 * Wait for element and interact with it
 */
async function waitAndClick(page, selector, timeout = 10000) {
  try {
    await page.waitForSelector(selector, { timeout });
    await page.click(selector);
    return true;
  } catch (error) {
    console.warn(`Could not click element with selector "${selector}": ${error.message}`);
    return false;
  }
}

/**
 * Wait for element and fill input
 */
async function waitAndFill(page, selector, value, timeout = 10000) {
  try {
    await page.waitForSelector(selector, { timeout });
    await page.fill(selector, value);
    return true;
  } catch (error) {
    console.warn(`Could not fill element with selector "${selector}": ${error.message}`);
    return false;
  }
}

/**
 * Extract text from multiple elements
 */
async function extractTexts(page, selector) {
  try {
    const texts = await page.locator(selector).allTextContents();
    return texts;
  } catch (error) {
    console.warn(`Could not extract texts from selector "${selector}": ${error.message}`);
    return [];
  }
}

/**
 * Generate HTML email template
 */
function generateEmailTemplate(title, content, metadata = {}) {
  const timestamp = new Date().toISOString();
  
  return `
    <!DOCTYPE html>
    <html>
      <head>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 800px; margin: 0 auto; padding: 20px; background: #f9f9f9; }
          .header { background: #2c3e50; color: white; padding: 20px; border-radius: 5px 5px 0 0; }
          .content { background: white; padding: 20px; border: 1px solid #ddd; }
          .footer { background: #ecf0f1; padding: 15px; border-radius: 0 0 5px 5px; font-size: 12px; color: #666; }
          .section { margin: 20px 0; }
          .section h3 { color: #2c3e50; border-bottom: 2px solid #3498db; padding-bottom: 10px; }
          .metadata { background: #ecf0f1; padding: 10px; border-radius: 3px; margin: 10px 0; }
          .fail { color: #e74c3c; font-weight: bold; }
          .pass { color: #27ae60; font-weight: bold; }
          .warning { background: #fff3cd; border-left: 4px solid #ffc107; padding: 10px; margin: 10px 0; }
          table { width: 100%; border-collapse: collapse; margin: 10px 0; }
          th, td { padding: 10px; text-align: left; border-bottom: 1px solid #ddd; }
          th { background: #3498db; color: white; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>${title}</h1>
          </div>
          <div class="content">
            <div class="metadata">
              <p><strong>Executed:</strong> ${timestamp}</p>
              ${Object.entries(metadata).map(([key, value]) => `<p><strong>${key}:</strong> ${value}</p>`).join('')}
            </div>
            <div class="section">
              ${content}
            </div>
          </div>
          <div class="footer">
            <p>This is an automated message from FLM Cake Verification System.</p>
            <p>Please do not reply to this email.</p>
          </div>
        </div>
      </body>
    </html>
  `;
}

module.exports = {
  launchBrowser,
  getSchedulerDateRange,
  formatDateForInput,
  formatDateDisplay,
  captureScreenshot,
  sendEmail,
  createLogEntry,
  writeLog,
  saveReport,
  navigateToCake,
  waitAndClick,
  waitAndFill,
  extractTexts,
  generateEmailTemplate
};
