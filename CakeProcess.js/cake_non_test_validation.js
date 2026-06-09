/**
 * FLM AUTOMATION AGENT - Non-Test Filter Lead Validation (Cake + CDB)
 * 
 * ⚙️ EXECUTION MODE: HEADED (Browser Visible) or HEADLESS
 * 
 * 📌 STEP-BY-STEP AUTOMATION:
 * 1. Determine the latest scheduler date (Mon/Wed/Fri) and set Start Date = Latest Scheduler Date, End Date = Current Date.
 * 2. Log in to Cake with provided credentials.
 * 3. Open Conversions Report and apply "Non-Tests" filter.
 * 4. Select exactly ONE URL Name to process for this execution (rotate sequentially or via CLI argument).
 * 5. Search for the URL Name in the Conversions report grid.
 * 6. For each matching lead row:
 *    - Open the lead.
 *    - Extract Lead ID.
 *    - Personal Info Validation: First Name, Last Name, Email should NOT contain "CKMTEST".
 *    - Pixel Log Validation: Disposition vs Pixel Fired.
 *    - Sale Info Validation: Pixel Fired vs Disposition.
 *    - Vertical Specific Validation: Tax Debt, Neustar, Neustar Disposition.
 *    - Email Oversight Validation: Email Oversight = "Verified".
 *    - Copy Lead ID.
 *    - Close lead/Go back to Conversions report.
 * 7. For each successfully copied Lead ID, perform CDB Verification:
 *    - Log in to CDB.
 *    - Navigate to correct Lead Listing page based on URL Name (TRA Listing, WhiteCollar Lead Listing, or Lead Listing).
 *    - Search Lead ID and verify if found.
 * 8. Generate final validation report and execution summary.
 */

const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '..', '.env') });

const utils = require('./cake_utils');
const googleSheets = require('../utils/googleSheetsUtils');

// URL Names list
const URL_NAMES = [
  'Second Chance',
  'Top Money',
  'White Collar',
  'TRA',
  'Premier Tax Relief (PTR)'
];

// Configuration
const CONFIG = {
  CAKE_LOGIN_URL: 'https://app.forwardleapmarketing.com/newaff.aspx',
  CDB_LOGIN_URL: 'https://www.flmreporting.com/flm_central_leads/auth/login.php',
  CDB_CREDENTIALS: {
    email: 'nirav.dobariya@bytestechnolab.com',
    password: 'Nirav@1234'
  },
  CAKE_CREDENTIALS: {
    username: 'urvish.patel@bytestechnolab.com',
    password: 'Urvish@123#2026-06'
  },
  STATE_FILE: path.join(__dirname, 'cake_non_test_state.json'),
  AUTH_STATE_PATH: path.join(__dirname, 'cake_non_test_auth_state.json'),
  REPORT_DIR: path.join(__dirname, 'lead_validation_reports'),
  SCREENSHOT_DIR: path.join(__dirname, 'lead_validation_screenshots')
};

// Ensure directories exist
function ensureDirectories() {
  [CONFIG.REPORT_DIR, CONFIG.SCREENSHOT_DIR].forEach(dir => {
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
  });
}

function setupLogging() {
  const logFile = path.join(CONFIG.REPORT_DIR, `non_test_execution_${Date.now()}.log`);
  return logFile;
}

/**
 * Determine latest scheduler date (Monday / Wednesday / Friday)
 */
function getLatestSchedulerDate(referenceDate = new Date()) {
  const scheduledDays = new Set([1, 3, 5]); // Mon / Wed / Fri
  const start = new Date(referenceDate);
  // Subtract 1 day first to ensure we get the previous scheduled day if today is a scheduled day
  start.setDate(start.getDate() - 1);
  while (!scheduledDays.has(start.getDay())) {
    start.setDate(start.getDate() - 1);
  }
  return start;
}

/**
 * Get date range for execution
 */
function getDateRange() {
  const today = new Date();
  const latestScheduler = getLatestSchedulerDate(today);
  return {
    startDate: utils.formatDateForInput(latestScheduler),
    endDate: utils.formatDateForInput(today),
    displayStart: utils.formatDateDisplay(latestScheduler),
    displayEnd: utils.formatDateDisplay(today)
  };
}

/**
 * Select URL Name for this run
 */
function selectUrlName(logFile) {
  // Check CLI argument first
  const cliArg = process.argv.find(arg => arg.startsWith('--url-name='));
  if (cliArg) {
    const val = cliArg.split('=')[1];
    utils.writeLog(logFile, `Using URL Name from CLI: "${val}"`, 'INFO');
    return val;
  }

  // Load state and cycle
  let state = { lastUrlNameIndex: -1 };
  try {
    if (fs.existsSync(CONFIG.STATE_FILE)) {
      state = JSON.parse(fs.readFileSync(CONFIG.STATE_FILE, 'utf-8'));
    }
  } catch (e) {
    utils.writeLog(logFile, `Error reading state file: ${e.message}`, 'WARN');
  }

  const nextIndex = (state.lastUrlNameIndex + 1) % URL_NAMES.length;
  const selectedName = URL_NAMES[nextIndex];
  
  // Save updated state
  try {
    fs.writeFileSync(CONFIG.STATE_FILE, JSON.stringify({ lastUrlNameIndex: nextIndex }, null, 2));
  } catch (e) {
    utils.writeLog(logFile, `Error writing state file: ${e.message}`, 'WARN');
  }

  utils.writeLog(logFile, `Selected URL Name via rotation: "${selectedName}" (index: ${nextIndex})`, 'INFO');
  return selectedName;
}

/**
 * Handle login to Cake CRM
 */
async function handleCakeLogin(page, logFile) {
  utils.writeLog(logFile, 'Navigating to Cake login page...', 'INFO');
  await page.goto(CONFIG.CAKE_LOGIN_URL, { waitUntil: 'domcontentloaded', timeout: 30000 });
  await page.waitForTimeout(2000);

  const loginButton = await page.$('#submitButton, button:has-text("Log In"), input[type="submit"]');
  if (loginButton) {
    utils.writeLog(logFile, 'Login page loaded. Entering credentials...', 'INFO');
    const usernameField = await page.$('#u, input[name="u"], input[type="text"]');
    const passwordField = await page.$('#password, input[name="p"], input[type="password"]');

    if (usernameField && passwordField) {
      await usernameField.fill(CONFIG.CAKE_CREDENTIALS.username);
      await passwordField.fill(CONFIG.CAKE_CREDENTIALS.password);
      await page.waitForTimeout(500);
      await loginButton.click();
      
      utils.writeLog(logFile, 'Waiting for authentication...', 'INFO');
      // Wait for login redirection
      let success = false;
      for (let i = 0; i < 20; i++) {
        await page.waitForTimeout(1000);
        const currentUrl = page.url();
        const loginVisible = await page.locator('#submitButton, button:has-text("Log In")').first().isVisible().catch(() => false);
        if (!loginVisible && !currentUrl.includes('newaff.aspx')) {
          success = true;
          break;
        }
      }
      if (success) {
        utils.writeLog(logFile, '✓ Cake login successful!', 'INFO');
        return true;
      }
    }
    utils.writeLog(logFile, '✗ Cake login failed - credentials incorrect or MFA block', 'ERROR');
    return false;
  }
  utils.writeLog(logFile, 'Already logged in or redirect completed', 'INFO');
  return true;
}

/**
 * Apply Conversions Report filters
 */
async function applyConversionsFilter(page, startDate, endDate, logFile) {
  utils.writeLog(logFile, 'Navigating to Cake Reports > Conversions', 'INFO');
  
  // Navigate to Conversions Report
  const reportsLink = page.locator('a[href="newrep.aspx"], a:has-text("REPORTS")').first();
  if (await reportsLink.isVisible({ timeout: 5000 }).catch(() => false)) {
    await reportsLink.click();
    await page.waitForLoadState('domcontentloaded').catch(() => {});
    await page.waitForTimeout(1500);
  }

  const conversionsItem = page.locator('.secondary-menu-item-text, .secondary-menu-item-container').filter({ hasText: /^Conversions$/i }).first();
  if (await conversionsItem.isVisible({ timeout: 5000 }).catch(() => false)) {
    await conversionsItem.click();
    await page.waitForLoadState('domcontentloaded').catch(() => {});
    await page.waitForTimeout(2000);
  } else {
    // Try direct URL navigation if link is missing
    const currentUrl = page.url();
    const baseUrl = new URL(currentUrl).origin;
    await page.goto(`${baseUrl}/reports/conversion`, { waitUntil: 'domcontentloaded', timeout: 15000 }).catch(() => {});
    await page.waitForTimeout(2000);
  }

  // Get correct frame for inputs and ExtJS
  let frame = page;
  for (let i = 0; i < 15; i++) {
    const allFrames = page.frames();
    const f = allFrames.find(f => f.name() === 'repFrame' || f.url().includes('reports/conversion') || f.url().includes('Reports/Conversion'));
    if (f) { frame = f; break; }
    utils.writeLog(logFile, `Frame search attempt ${i + 1}/15. Current frames: ${allFrames.map(fr => `[Name: "${fr.name()}", URL: "${fr.url()}"]`).join(', ')}`, 'INFO');
    await page.waitForTimeout(1000);
  }
  utils.writeLog(logFile, `Using frame for report controls: ${frame === page ? 'main page' : 'repFrame'}`, 'INFO');

  // Set date range on the frame
  utils.writeLog(logFile, `Setting date range: ${startDate} to ${endDate}`, 'INFO');
  await frame.evaluate(({ start, end }) => {
    const isDateLike = (value) => /^\d{1,2}\/\d{1,2}\/\d{4}$/.test((value || '').trim());
    const inputs = Array.from(document.querySelectorAll('input')).filter(el => isDateLike(el.value));
    if (inputs.length >= 2) {
      inputs[0].value = start;
      inputs[1].value = end;
      inputs[0].dispatchEvent(new Event('change'));
      inputs[1].dispatchEvent(new Event('change'));
    }
  }, { start: startDate, end: endDate });
  await frame.waitForTimeout(1000);

  // Apply "Non-Tests" filter
  utils.writeLog(logFile, 'Applying "Non-Tests" filter...', 'INFO');
  
  let applied = await frame.evaluate(() => {
    const inputs = Array.from(document.querySelectorAll('input.x-form-field'));
    const testComboInput = inputs.find(i => /test/i.test(i.value));
    if (testComboInput) {
      const wrap = testComboInput.closest('.x-form-field-wrap') || testComboInput.parentElement;
      const trigger = wrap ? wrap.querySelector('.x-form-trigger') : null;
      if (trigger) {
        trigger.click();
        return true;
      }
    }
    return false;
  }).catch(() => false);

  if (applied) {
    await frame.waitForTimeout(1000);
    const itemClicked = await frame.evaluate(() => {
      const items = Array.from(document.querySelectorAll('.x-combo-list-item'));
      const target = items.find(el => /non-test/i.test(el.textContent) && !/&|and/i.test(el.textContent));
      if (target) {
        target.click();
        return true;
      }
      return false;
    }).catch(() => false);
    
    if (itemClicked) {
      utils.writeLog(logFile, '✓ Successfully applied Non-Tests filter via UI dropdown click.', 'INFO');
      applied = true;
    } else {
      applied = false;
    }
  }

  if (!applied) {
    utils.writeLog(logFile, '⚠ UI dropdown click failed. Trying programmatic ExtJS combo select...', 'WARN');
    const extApplied = await frame.evaluate(() => {
      if (typeof window.Ext !== 'undefined' && window.Ext.ComponentMgr && window.Ext.ComponentMgr.all) {
        const allItems = window.Ext.ComponentMgr.all.items || [];
        const combos = allItems.filter(c => c && c.getXType && c.getXType() === 'combo');
        for (const combo of combos) {
          const store = combo.getStore && combo.getStore();
          if (store && typeof store.find === 'function') {
            let idx = -1;
            store.each((r, index) => {
              const txt = String(r.get(combo.displayField || 'text') || '').trim();
              if (/non-test/i.test(txt) && !/&|and/i.test(txt)) {
                idx = index;
              }
            });

            if (idx !== -1) {
              const record = store.getAt(idx);
              combo.setValue(record.get(combo.valueField || 'value'));
              if (typeof combo.fireEvent === 'function') {
                combo.fireEvent('select', combo, record, idx);
                combo.fireEvent('change', combo, combo.getValue());
              }
              return true;
            }
          }
        }
      }
      return false;
    }).catch(() => false);

    if (extApplied) {
      utils.writeLog(logFile, '✓ Successfully applied Non-Tests filter via ExtJS programmatic fallback.', 'INFO');
    } else {
      utils.writeLog(logFile, '⚠ Failed ExtJS programmatic. Trying HTML select fallback...', 'WARN');
      const selectElements = await frame.locator('select').all();
      for (const select of selectElements) {
        const options = await select.locator('option').allTextContents();
        const nonTestIndex = options.findIndex(opt => /non-test/i.test(opt) && !/and non-test/i.test(opt));
        if (nonTestIndex !== -1) {
          const val = await select.locator('option').nth(nonTestIndex).getAttribute('value') || options[nonTestIndex];
          await select.selectOption(val);
          utils.writeLog(logFile, `✓ Selected "${options[nonTestIndex]}" in HTML select element.`, 'INFO');
          break;
        }
      }
    }
  }

  // Trigger search / run report
  utils.writeLog(logFile, 'Clicking search/filter button...', 'INFO');
  const searchClicked = await frame.evaluate(() => {
    const filterTd = Array.from(document.querySelectorAll('td.x-btn-mc')).find(td => td.innerText.includes('Filter'));
    if (filterTd) {
      const btn = filterTd.querySelector('button') || filterTd;
      btn.click();
      return true;
    }
    return false;
  });

  if (searchClicked) {
    utils.writeLog(logFile, '✓ Filter button clicked successfully.', 'INFO');
  } else {
    utils.writeLog(logFile, 'Filter button not found via ExtJS td.x-btn-mc, trying fallback search button selectors...', 'WARN');
    const runBtn = frame.locator('button:has-text("Run Report"), button:has-text("Search"), input[type="submit"][value*="Search"]').first();
    if (await runBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
      await runBtn.click();
    }
  }
  
  await frame.waitForTimeout(6000);
}

/**
 * Intelligent helper to extract field values from the current tab layout
 */
async function getValueByLabel(page, labelText) {
  const val = await page.evaluate((lbl) => {
    const normalize = (s) => (s || '').toLowerCase().replace(/[^a-z0-9]/g, '');
    const normText = normalize(lbl);
    
    // 1. Direct input/select search by normalized ID/Name/Placeholder
    const inputs = Array.from(document.querySelectorAll('input, select'));
    for (const input of inputs) {
      const id = normalize(input.id);
      const name = normalize(input.name);
      const ph = normalize(input.getAttribute('placeholder'));
      if (id === normText || name === normText || (id && id.includes(normText)) || (name && name.includes(normText))) {
        if (input.value && input.value.trim()) {
          return input.value.trim();
        }
      }
    }
    
    // 2. Search form labels
    const labels = Array.from(document.querySelectorAll('label, td, span, div'));
    for (const label of labels) {
      const txt = (label.textContent || '').trim().toLowerCase();
      const normTxt = normalize(txt);
      if (normTxt === normText || normTxt.startsWith(normText) || normTxt.includes(normText)) {
        // Check next sibling
        let next = label.nextElementSibling;
        if (next) {
          const input = next.querySelector('input, select') || (['input', 'select'].includes(next.tagName.toLowerCase()) ? next : null);
          if (input && input.value && input.value.trim()) return input.value.trim();
        }
        // Check parent's next sibling
        const parent = label.parentElement;
        if (parent && parent.nextElementSibling) {
          const nextSibling = parent.nextElementSibling;
          const input = nextSibling.querySelector('input, select') || (['input', 'select'].includes(nextSibling.tagName.toLowerCase()) ? nextSibling : null);
          if (input && input.value && input.value.trim()) return input.value.trim();
        }
        // Check closest form item wrap
        const wrap = label.closest('.x-form-item');
        if (wrap) {
          const input = wrap.querySelector('input, select');
          if (input && input.value && input.value.trim()) return input.value.trim();
        }
      }
    }
    
    // 3. Fallback: Check if there's any non-empty input matching by ID/Name
    for (const input of inputs) {
      const id = normalize(input.id);
      const name = normalize(input.name);
      if (id.includes(normText) || name.includes(normText)) {
        return input.value.trim();
      }
    }
    
    return '';
  }, labelText);

  return val || '';
}

/**
 * Select tab inside lead detail page
 */
async function selectTab(page, tabName, logFile) {
  utils.writeLog(logFile, `Selecting tab: ${tabName}`, 'INFO');
  
  // Try native browser-side evaluation to find ExtJS tab buttons
  const clicked = await page.evaluate((name) => {
    const lowerName = name.toLowerCase();
    
    // 1. Search all elements with text exactly matching name
    const elements = Array.from(document.querySelectorAll('span, a, li, div, button, em'));
    const tabEl = elements.find(el => {
      const txt = (el.textContent || '').trim().toLowerCase();
      // Match exact text and make sure it is inside tab strip or panel header
      return txt === lowerName && (
        el.className.includes('x-tab') || 
        el.className.includes('tab') || 
        el.closest('.x-tab-panel-header') || 
        el.closest('.x-tab-strip')
      );
    });
    
    if (tabEl) {
      tabEl.click();
      return true;
    }
    
    // 2. Fallback: Search elements containing the name inside tab headers
    const fallbackEl = elements.find(el => {
      const txt = (el.textContent || '').trim().toLowerCase();
      return txt.includes(lowerName) && (
        el.className.includes('x-tab') || 
        el.className.includes('tab') || 
        el.closest('.x-tab-panel-header') || 
        el.closest('.x-tab-strip')
      );
    });
    
    if (fallbackEl) {
      fallbackEl.click();
      return true;
    }
    
    return false;
  }, tabName).catch(() => false);

  if (clicked) {
    await page.waitForTimeout(1500);
    return true;
  }
  
  // Fallback to playwright locator strategy
  const tabSelectors = [
    `[role="tab"]:has-text("${tabName}")`,
    `.tab:has-text("${tabName}")`,
    `a:has-text("${tabName}")`,
    `li:has-text("${tabName}")`,
    `span:has-text("${tabName}")`
  ];
  for (const selector of tabSelectors) {
    const tabButton = page.locator(selector).first();
    if (await tabButton.isVisible({ timeout: 2000 }).catch(() => false)) {
      await tabButton.click();
      await page.waitForTimeout(1000);
      return true;
    }
  }
  utils.writeLog(logFile, `⚠ Could not navigate to tab: ${tabName}`, 'WARN');
  return false;
}

/**
 * Extract Lead ID from page
 */
async function extractLeadIDFromPage(page) {
  const idVal = await page.evaluate(() => {
    // Search strictly inside the active popup window (.x-window) to avoid DOM bleeding from main page grid headers
    const win = document.querySelector('.x-window') || document.body;
    
    // 1. Look for the ID label box on the left panel
    const elements = Array.from(win.querySelectorAll('div, span, td, b, label'));
    for (const el of elements) {
      const txt = (el.textContent || '').trim();
      if (txt === 'ID' || txt === 'Lead ID' || txt === 'Lead ID:') {
        const parent = el.parentElement;
        if (parent) {
          const parentTxt = (parent.textContent || '').trim();
          const hexMatch = parentTxt.match(/\b([0-9A-F]{8})\b/i);
          if (hexMatch) return hexMatch[1].toUpperCase();
        }
        // Check next sibling
        const next = el.nextElementSibling;
        if (next) {
          const nextTxt = (next.textContent || '').trim();
          const hexMatch = nextTxt.match(/\b([0-9A-F]{8})\b/i);
          if (hexMatch) return hexMatch[1].toUpperCase();
        }
      }
    }
    
    // 2. Search the visible text inside the window/body for 8-character hex codes
    const winText = win.innerText || '';
    const matches = winText.match(/\b([0-9A-F]{8})\b/gi);
    if (matches) {
      for (const m of matches) {
        // Exclude Pure Numbers, CKMTEST, and common ExtJS ID patterns if any
        if (m !== 'CKMTESTP' && !/^[0-9]+$/.test(m)) {
          return m.toUpperCase();
        }
      }
    }
    
    return '';
  });

  return idVal || '';
}

/**
 * Validate open lead details in Cake
 */
async function validateLeadInCake(page, logFile) {
  const result = {
    leadId: '',
    firstNameVal: 'Passed',
    lastNameVal: 'Passed',
    emailVal: 'Passed',
    pixelFired: '',
    disposition: '',
    pixelLogStatus: 'Passed',
    saleInfoStatus: 'Passed',
    taxDebt: '',
    neustar: '',
    neustarDisp: '',
    verticalStatus: 'Passed',
    emailOversight: '',
    emailOversightStatus: 'Passed',
    overallStatus: 'Passed',
    reasons: []
  };

  try {
    result.leadId = await extractLeadIDFromPage(page);
    utils.writeLog(logFile, `Validating Lead ID: ${result.leadId}`, 'INFO');

    // 1. Personal Info Validation
    await selectTab(page, 'Personal Info', logFile);
    const firstName = await getValueByLabel(page, 'First Name');
    const lastName = await getValueByLabel(page, 'Last Name');
    const email = await getValueByLabel(page, 'Email');
    
    utils.writeLog(logFile, `Personal Info - First Name: "${firstName}", Last Name: "${lastName}", Email: "${email}"`, 'INFO');

    if (/CKMTEST/i.test(firstName)) {
      result.firstNameVal = 'Failed';
      result.overallStatus = 'Failed';
      result.reasons.push('First Name contains "CKMTEST"');
    }
    if (/CKMTEST/i.test(lastName)) {
      result.lastNameVal = 'Failed';
      result.overallStatus = 'Failed';
      result.reasons.push('Last Name contains "CKMTEST"');
    }
    if (/CKMTEST/i.test(email)) {
      result.emailVal = 'Failed';
      result.overallStatus = 'Failed';
      result.reasons.push('Email contains "CKMTEST"');
    }

    // Email Oversight extraction (might be here or on another tab)
    let emailOversight = await getValueByLabel(page, 'Email Oversight');

    // 2. Sale Info Validation (Right panel)
    await selectTab(page, 'Sale Info', logFile);
    const pixelFired = await getValueByLabel(page, 'Pixel Fired');
    result.pixelFired = pixelFired;
    utils.writeLog(logFile, `Sale Info - Pixel Fired: "${pixelFired}"`, 'INFO');

    // 3. Vertical Specific Validation (Right panel)
    await selectTab(page, 'Vertical Specific', logFile);
    const taxDebtStr = await getValueByLabel(page, 'Tax Debt');
    const neustar = await getValueByLabel(page, 'Neustar');
    const neustarDisp = await getValueByLabel(page, 'Neustar Disposition');
    
    result.taxDebt = taxDebtStr;
    result.neustar = neustar;
    result.neustarDisp = neustarDisp;
    utils.writeLog(logFile, `Vertical Specific - Tax Debt: "${taxDebtStr}", Neustar: "${neustar}", Neustar Disposition: "${neustarDisp}"`, 'INFO');

    if (emailOversight === '') {
      emailOversight = await getValueByLabel(page, 'Email Oversight');
    }
    result.emailOversight = emailOversight;

    const debtNum = parseFloat(taxDebtStr.replace(/[^0-9.]/g, ''));
    if (!isNaN(debtNum)) {
      if (debtNum < 10000) {
        if (!/under/i.test(neustar)) {
          result.verticalStatus = 'Failed';
          result.overallStatus = 'Failed';
          result.reasons.push(`Tax debt < 10,000 but Neustar is "${neustar}" (expected "Under")`);
        }
      } else {
        if (!neustar || !neustarDisp) {
          result.verticalStatus = 'Failed';
          result.overallStatus = 'Failed';
          result.reasons.push(`Tax debt >= 10,000 but Neustar ("${neustar}") or Neustar Disposition ("${neustarDisp}") is missing`);
        }
      }
    } else {
      utils.writeLog(logFile, `⚠ Could not parse Tax Debt numeric value: "${taxDebtStr}"`, 'WARN');
    }

    // 4. Pixel Log Validation (Left panel - click this last)
    await selectTab(page, 'Pixel Log', logFile);
    const disposition = await getValueByLabel(page, 'Disposition');
    result.disposition = disposition;
    utils.writeLog(logFile, `Pixel Log - Disposition: "${disposition}"`, 'INFO');

    // Validate Pixel Rules (uses disposition from Pixel Log and pixelFired from Sale Info)
    const isDup = disposition.toLowerCase() === 'duplicate';
    const isPixelYes = /yes|true/i.test(pixelFired);
    if (isDup && isPixelYes) {
      result.pixelLogStatus = 'Failed';
      result.saleInfoStatus = 'Failed';
      result.overallStatus = 'Failed';
      result.reasons.push('Pixel Log: Disposition = Duplicate AND Pixel Fired = Yes');
    }

    // 5. Email Oversight Validation
    utils.writeLog(logFile, `Email Oversight status: "${emailOversight}"`, 'INFO');
    if (!/verified/i.test(emailOversight)) {
      result.emailOversightStatus = 'Failed';
      result.overallStatus = 'Failed';
      result.reasons.push(`Email Oversight is "${emailOversight}" (expected "Verified")`);
    }

  } catch (err) {
    utils.writeLog(logFile, `Error validating lead: ${err.message}`, 'ERROR');
    result.overallStatus = 'Failed';
    result.reasons.push(`Validation process error: ${err.message}`);
  }

  return result;
}

/**
 * Handle CDB login and verify Lead ID
 */
async function verifyLeadInCDB(page, urlName, leadId, logFile) {
  utils.writeLog(logFile, `--- CDB Verification for Lead ID: ${leadId} ---`, 'INFO');
  
  try {
    await page.goto(CONFIG.CDB_LOGIN_URL, { waitUntil: 'domcontentloaded', timeout: 30000 });
    
    // Login if login form is present
    const loginButton = await page.$('button[type="submit"], button:has-text("Login")');
    if (loginButton) {
      utils.writeLog(logFile, 'CDB Login required. Submitting credentials...', 'INFO');
      await page.fill('input[type="email"], input[placeholder*="Email"]', CONFIG.CDB_CREDENTIALS.email);
      await page.fill('input[type="password"]', CONFIG.CDB_CREDENTIALS.password);
      await loginButton.click();
      await page.waitForNavigation({ waitUntil: 'domcontentloaded', timeout: 15000 }).catch(() => {});
      await page.waitForTimeout(2000);
    }

    // Navigate based on URL Name
    let listingText = 'Lead Listing';
    if (urlName === 'TRA') {
      listingText = 'TRA Listing';
    } else if (urlName === 'White Collar') {
      listingText = 'WhiteCollar Lead Listing';
    }

    utils.writeLog(logFile, `Navigating to Listing menu item: "${listingText}"`, 'INFO');
    const listingLink = page.locator(`a:has-text("${listingText}")`).first();
    if (await listingLink.isVisible({ timeout: 5000 }).catch(() => false)) {
      await listingLink.click();
      await page.waitForTimeout(2500);
    } else {
      // Direct navigation fallback based on text
      const currentUrl = page.url();
      const baseUrl = new URL(currentUrl).origin;
      if (listingText === 'TRA Listing') {
        await page.goto(`${baseUrl}/flm_central_leads/tra_leads.php`).catch(() => {});
      } else if (listingText === 'WhiteCollar Lead Listing') {
        await page.goto(`${baseUrl}/flm_central_leads/white_collar_leads.php`).catch(() => {});
      } else {
        await page.goto(`${baseUrl}/flm_central_leads/leads.php`).catch(() => {});
      }
      await page.waitForTimeout(2500);
    }

    // Search for Lead ID
    utils.writeLog(logFile, `Searching CDB for Lead ID: "${leadId}"`, 'INFO');
    const searchInputs = await page.locator('input[type="search"], input[placeholder*="Search"]').all();
    if (searchInputs.length > 0) {
      // Use the last search input (usually the table search box)
      const searchBox = searchInputs[searchInputs.length - 1];
      await searchBox.fill(leadId);
      await searchBox.press('Enter');
      await page.waitForTimeout(3000);

      // Verify lead ID is present in table rows
      const rowTexts = await page.locator('table tr').allTextContents();
      const match = rowTexts.some(text => text.includes(leadId));
      if (match) {
        utils.writeLog(logFile, `✓ Lead ID "${leadId}" successfully FOUND in CDB Listing`, 'INFO');
        return 'Passed';
      }
    }

    utils.writeLog(logFile, `✗ Lead ID "${leadId}" NOT FOUND in CDB Listing`, 'ERROR');
    return 'Failed';
  } catch (err) {
    utils.writeLog(logFile, `CDB verification error: ${err.message}`, 'ERROR');
    return 'Failed';
  }
}

/**
 * Update the FML CSV Dashboard
 */
async function updateDashboardCSV(urlName, leadId, overallStatus, cdbStatus, logFile) {
  utils.writeLog(logFile, 'Updating CSV Dashboard...', 'INFO');
  try {
    const now = new Date();
    const dashboardDir = path.join(__dirname, '..', 'FML_Project_Dashboard');
    const monthFolder = path.join(dashboardDir, `${now.toLocaleString('default', { month: 'long' })}_${now.getFullYear()}`);
    const csvPath = path.join(monthFolder, `Non_Test_Validation_Dashboard.csv`);

    if (!fs.existsSync(monthFolder)) {
      fs.mkdirSync(monthFolder, { recursive: true });
    }

    const cdbStatusStr = cdbStatus === 'Passed' ? 'True' : 'False';
    const allConditionStr = overallStatus === 'Passed' ? 'True' : 'False';

    const headers = ["Search URL Name", "Lead ID", "CDB Status", "All Condition"];
    const newRow = `"${urlName}","${leadId}","${cdbStatusStr}","${allConditionStr}"\n`;

    let writeHeader = !fs.existsSync(csvPath);
    if (writeHeader) {
      fs.writeFileSync(csvPath, headers.join(',') + '\n', 'utf-8');
    }
    fs.appendFileSync(csvPath, newRow, 'utf-8');
    utils.writeLog(logFile, `✓ CSV Dashboard updated successfully at: ${csvPath}`, 'INFO');
  } catch (err) {
    utils.writeLog(logFile, `✗ Failed to update CSV Dashboard: ${err.message}`, 'ERROR');
  }
}



/**
 * Generate final execution report
 */
function writeFinalReport(validationResults, urlName, dateRange) {
  const reportPath = path.join(CONFIG.REPORT_DIR, `non_test_report_${Date.now()}.json`);
  
  const total = validationResults.length;
  const passed = validationResults.filter(r => r.overallStatus === 'Passed').length;
  const failed = validationResults.filter(r => r.overallStatus === 'Failed').length;

  const report = {
    executionTime: new Date().toISOString(),
    urlNameProcessed: urlName,
    dateRangeProcessed: dateRange,
    summary: {
      totalLeadsProcessed: total,
      passedLeads: passed,
      failedLeads: failed
    },
    results: validationResults
  };

  fs.writeFileSync(reportPath, JSON.stringify(report, null, 2), 'utf-8');
  console.log(`\n✓ Final Validation Report written to: ${reportPath}`);

  // Print failure summary to console
  if (failed > 0) {
    console.log('\n❌ FAILURE SUMMARY:');
    validationResults.forEach(r => {
      if (r.overallStatus === 'Failed') {
        console.log(`  Lead ID: ${r.leadId || 'N/A'} - Reasons: ${r.reasons.join(', ')}`);
      }
    });
  } else {
    console.log('\n✅ All processed leads passed validation!');
  }
}

/**
 * Main Runner Function
 */
async function runNonTestValidation() {
  console.log('='.repeat(70));
  console.log('FLM Agent - Non-Test Filter Lead Validation (Cake + CDB)');
  console.log('='.repeat(70));

  ensureDirectories();
  const logFile = setupLogging();
  const dateRange = getDateRange();
  
  utils.writeLog(logFile, `Process Started - Date Range: ${dateRange.displayStart} to ${dateRange.displayEnd}`, 'INFO');
  
  const targetUrlName = selectUrlName(logFile);
  utils.writeLog(logFile, `Target URL Name for this run: "${targetUrlName}"`, 'INFO');

  let browser;
  const validationResults = [];

  try {
    const isHeaded = process.argv.includes('--headed');
    utils.writeLog(logFile, `Launching browser (headed: ${isHeaded})`, 'INFO');
    browser = await utils.launchBrowser(isHeaded);
    
    const context = await browser.newContext({
      storageState: fs.existsSync(CONFIG.AUTH_STATE_PATH) ? CONFIG.AUTH_STATE_PATH : undefined
    });
    const page = await context.newPage();
    let cdbPage = null;

    // 1. Log in to Cake CRM
    await handleCakeLogin(page, logFile);
    await context.storageState({ path: CONFIG.AUTH_STATE_PATH });

    // 2. Open Conversions Report and Apply filters
    await applyConversionsFilter(page, dateRange.startDate, dateRange.endDate, logFile);

    // 3. Scan conversions grid page by page to find all matching leads
    const rowsSelector = '.x-grid3-row';
    let matchingLeadIndices = [];

    // Get correct frame for scanning rows
    let frame = page;
    for (let i = 0; i < 15; i++) {
      const allFrames = page.frames();
      const f = allFrames.find(f => f.name() === 'repFrame' || f.url().includes('reports/conversion') || f.url().includes('Reports/Conversion'));
      if (f) { frame = f; break; }
      utils.writeLog(logFile, `Frame search attempt ${i + 1}/15. Current frames: ${allFrames.map(fr => `[Name: "${fr.name()}", URL: "${fr.url()}"]`).join(', ')}`, 'INFO');
      await page.waitForTimeout(1000);
    }
    utils.writeLog(logFile, `Using frame for row scanning: ${frame === page ? 'main page' : 'repFrame'}`, 'INFO');

    // Wait for the grid rows to settle / be visible
    await frame.waitForTimeout(2000);
    const rowsCount = await frame.locator(rowsSelector).count().catch(() => 0);
    utils.writeLog(logFile, `Rows count detected: ${rowsCount}`, 'INFO');

    if (rowsCount > 0) {
      utils.writeLog(logFile, 'Conversion grid loaded. Scanning rows...', 'INFO');
      
      const rows = await frame.locator(rowsSelector).all();
      utils.writeLog(logFile, `Found ${rows.length} rows in total. Filtering by URL Name: "${targetUrlName}"`, 'INFO');

      // Find matching row indices using page evaluation to read full DOM attributes
      matchingLeadIndices = await frame.evaluate(({ urlName, sel }) => {
        const rowEls = Array.from(document.querySelectorAll(sel));
        const found = [];
        const lowerName = urlName.toLowerCase();
        
        rowEls.forEach((row, index) => {
          // Check text content
          const text = (row.textContent || '').toLowerCase();
          if (text.includes(lowerName)) {
            found.push(index);
            return;
          }
          
          // Check title, value, href, name, or other attributes of children
          const elements = Array.from(row.querySelectorAll('*'));
          const match = elements.some((el) => {
            const title = (el.getAttribute('title') || '').toLowerCase();
            const val = (el.value || '').toLowerCase();
            const href = (el.getAttribute('href') || '').toLowerCase();
            const extQtip = (el.getAttribute('ext:qtip') || '').toLowerCase();
            const qtip = (el.getAttribute('data-qtip') || '').toLowerCase();
            return title.includes(lowerName) || val.includes(lowerName) || href.includes(lowerName) || extQtip.includes(lowerName) || qtip.includes(lowerName);
          });
          if (match) {
            found.push(index);
          }
        });
        return found;
      }, { urlName: targetUrlName, sel: rowsSelector });
    }

    utils.writeLog(logFile, `Found ${matchingLeadIndices.length} matching leads for "${targetUrlName}"`, 'INFO');

    if (matchingLeadIndices.length > 5) {
      utils.writeLog(logFile, `Limiting check to 5 leads dynamically.`, 'INFO');
      matchingLeadIndices = matchingLeadIndices.slice(0, 5);
    }

    // 4. Process each matching lead one by one in Cake
    for (let index = 0; index < matchingLeadIndices.length; index++) {
      const rowIndex = matchingLeadIndices[index];
      utils.writeLog(logFile, `Processing matching lead #${index + 1} (Row Index: ${rowIndex})`, 'INFO');

      // Click row details link
      const rows = await frame.locator(rowsSelector).all();
      const row = rows[rowIndex];
      await row.scrollIntoViewIfNeeded().catch(() => {});
      
      // Find the first details link (Unique ID) in the row
      const detailsLink = row.locator('a').first();
      
      if (detailsLink) {
        let extractedId = '';
        try {
          const onclickAttr = await detailsLink.getAttribute('onclick').catch(() => '');
          const idMatch = onclickAttr.match(/showLead\((\d+)\)/);
          if (idMatch) {
            extractedId = idMatch[1];
            utils.writeLog(logFile, `Extracted Lead ID from link onclick: "${extractedId}"`, 'INFO');
          }
        } catch (onclickErr) {
          utils.writeLog(logFile, `Failed to parse onclick for Lead ID: ${onclickErr.message}`, 'WARN');
        }

        try {
          utils.writeLog(logFile, `Triggering details link click natively...`, 'INFO');
          await detailsLink.evaluate(el => el.click());
        } catch (err) {
          utils.writeLog(logFile, `Native click failed: ${err.message}. Trying standard click...`, 'WARN');
          await detailsLink.scrollIntoViewIfNeeded().catch(() => {});
          await detailsLink.click({ force: true }).catch(() => {});
        }
        
        // Wait for card iframe to appear or lead window elements on main page
        utils.writeLog(logFile, 'Waiting for lead card elements to load...', 'INFO');
        let cardFrame = null;
        for (let i = 0; i < 15; i++) {
          cardFrame = page.frames().find(f => f.url().includes('card.aspx') || f.url().includes('lead'));
          if (cardFrame) break;
          
          // Check if tabs are visible on main page
          const isLeadWindowVisible = await page.locator('[role="tab"], .tab, a:has-text("Personal Info")').first().isVisible().catch(() => false);
          if (isLeadWindowVisible) {
            utils.writeLog(logFile, 'Lead card elements detected on main page context.', 'INFO');
            cardFrame = page;
            break;
          }
          await page.waitForTimeout(1000);
        }

        let cakeVal = { overallStatus: 'Failed', reasons: ['Failed to open lead card iframe'] };
        if (cardFrame) {
          utils.writeLog(logFile, `✓ Lead card context resolved: ${cardFrame === page ? 'main page' : 'iframe'}.`, 'INFO');
          
          // Maximize ExtJS window on the parent page
          await page.evaluate(() => {
            if (typeof window.Ext !== 'undefined' && window.Ext.ComponentMgr) {
              const windows = window.Ext.ComponentMgr.all.items.filter(c => c && c.getXType && c.getXType() === 'window');
              windows.forEach(w => {
                if (typeof w.maximize === 'function') {
                  w.maximize();
                } else if (typeof w.setSize === 'function') {
                  w.setSize(1200, 700);
                  w.center();
                }
              });
            }
          }).catch(() => {});
          await page.waitForTimeout(1000);

          await cardFrame.waitForSelector('[role="tab"], .tab, a:has-text("Personal Info")', { timeout: 10000 }).catch(() => {});
          await page.waitForTimeout(1000);
          
          // Perform validations inside Cake lead detail view
          cakeVal = await validateLeadInCake(cardFrame, logFile);
          if ((!cakeVal.leadId || cakeVal.leadId === 'N/A') && extractedId) {
            cakeVal.leadId = extractedId;
            utils.writeLog(logFile, `Using fallback Lead ID from link onclick: "${extractedId}"`, 'INFO');
          }

          // Close card popup window on the parent page
          utils.writeLog(logFile, 'Closing lead card window...', 'INFO');
          // 1. Try native close button in DOM
          const closeBtn = page.locator('.x-window .x-tool-close, .x-tool-close').first();
          if (await closeBtn.isVisible().catch(() => false)) {
            await closeBtn.click().catch(() => {});
          }
          // 2. Fallback to ExtJS programmatic close
          await page.evaluate(() => {
            if (typeof window.Ext !== 'undefined' && window.Ext.ComponentMgr) {
              const windows = window.Ext.ComponentMgr.all.items.filter(c => c && c.getXType && c.getXType() === 'window');
              windows.forEach(w => {
                if (typeof w.close === 'function') {
                  w.close();
                }
              });
            }
          }).catch(() => {});
          await page.waitForTimeout(2000);
        } else {
          utils.writeLog(logFile, '✗ Lead card iframe not found after click.', 'ERROR');
        }

        cakeVal.urlName = targetUrlName;
        validationResults.push(cakeVal);
      } else {
        utils.writeLog(logFile, `✗ Could not locate details link for row index ${rowIndex}`, 'ERROR');
      }
    }

    // 5. CDB Verification for all successfully validated Lead IDs
    const leadsWithIds = validationResults.filter(l => l.leadId);
    utils.writeLog(logFile, `--- CDB Verification for ${leadsWithIds.length} extracted Lead IDs ---`, 'INFO');

    if (leadsWithIds.length > 0) {
      try {
        // Open Tab 2 for CDB if not already open
        if (!cdbPage) {
          utils.writeLog(logFile, 'Opening browser Tab 2 for CDB verification...', 'INFO');
          cdbPage = await context.newPage();
        }

        await cdbPage.goto(CONFIG.CDB_LOGIN_URL, { waitUntil: 'domcontentloaded', timeout: 30000 });
        
        // Login if login form is present
        const loginButton = await cdbPage.$('button[type="submit"], button:has-text("Login")');
        if (loginButton) {
          utils.writeLog(logFile, 'CDB Login required on Tab 2. Submitting credentials...', 'INFO');
          await cdbPage.fill('input[type="email"], input[placeholder*="Email"]', CONFIG.CDB_CREDENTIALS.email);
          await cdbPage.fill('input[type="password"]', CONFIG.CDB_CREDENTIALS.password);
          await loginButton.click();
          await cdbPage.waitForNavigation({ waitUntil: 'domcontentloaded', timeout: 15000 }).catch(() => {});
          await cdbPage.waitForTimeout(2000);
        }

        // Navigate based on URL Name once
        let listingText = 'Lead Listing';
        if (targetUrlName === 'TRA') {
          listingText = 'TRA Listing';
        } else if (targetUrlName === 'White Collar') {
          listingText = 'WhiteCollar Lead Listing';
        }

        utils.writeLog(logFile, `Navigating to Listing menu item: "${listingText}"`, 'INFO');
        const listingLink = cdbPage.locator(`a:has-text("${listingText}")`).first();
        if (await listingLink.isVisible({ timeout: 5000 }).catch(() => false)) {
          await listingLink.click();
          await cdbPage.waitForTimeout(2500);
        } else {
          // Direct navigation fallback based on text
          const currentUrl = cdbPage.url();
          const baseUrl = new URL(currentUrl).origin;
          if (listingText === 'TRA Listing') {
            await cdbPage.goto(`${baseUrl}/flm_central_leads/tra_leads.php`).catch(() => {});
          } else if (listingText === 'WhiteCollar Lead Listing') {
            await cdbPage.goto(`${baseUrl}/flm_central_leads/white_collar_leads.php`).catch(() => {});
          } else {
            await cdbPage.goto(`${baseUrl}/flm_central_leads/leads.php`).catch(() => {});
          }
          await cdbPage.waitForTimeout(2500);
        }

        // Now search each lead ID in CDB
        for (const lead of leadsWithIds) {
          utils.writeLog(logFile, `Searching CDB for Lead ID: "${lead.leadId}"`, 'INFO');
          const searchInputs = await cdbPage.locator('input[type="search"], input[placeholder*="Search"]').all();
          if (searchInputs.length > 0) {
            const searchBox = searchInputs[searchInputs.length - 1];
            await searchBox.fill('');
            await searchBox.fill(lead.leadId);
            await searchBox.press('Enter');
            await cdbPage.waitForTimeout(3000);

            // Verify lead ID is present in table rows
            const rowTexts = await cdbPage.locator('table tr').allTextContents();
            const match = rowTexts.some(text => text.includes(lead.leadId));
            if (match) {
              utils.writeLog(logFile, `✓ Lead ID "${lead.leadId}" successfully FOUND in CDB Listing`, 'INFO');
              lead.cdbValidation = 'Passed';
            } else {
              utils.writeLog(logFile, `✗ Lead ID "${lead.leadId}" NOT FOUND in CDB Listing`, 'ERROR');
              lead.cdbValidation = 'Failed';
              lead.overallStatus = 'Failed';
              lead.reasons.push('Lead ID not found in CDB listing');
            }
          }
          
          // Update CSV Dashboard for this lead
          await updateDashboardCSV(targetUrlName, lead.leadId, lead.overallStatus, lead.cdbValidation, logFile);
          
          // Append to Google Sheets 'Non Test' tab
          try {
            const cdbStatusStr = lead.cdbValidation === 'Passed' ? 'True' : 'False';
            const allConditionStr = lead.overallStatus === 'Passed' ? 'True' : 'False';
            await googleSheets.appendNonTestRow(targetUrlName, lead.leadId, cdbStatusStr, allConditionStr);
          } catch (sheetErr) {
            utils.writeLog(logFile, `Warning: Could not append to Google Sheet: ${sheetErr.message}`, 'WARN');
          }
        }
      } catch (err) {
        utils.writeLog(logFile, `CDB verification block error: ${err.message}`, 'ERROR');
        for (const lead of leadsWithIds) {
          lead.cdbValidation = 'Failed';
          lead.overallStatus = 'Failed';
          lead.reasons.push(`CDB block error: ${err.message}`);
          await updateDashboardCSV(targetUrlName, lead.leadId, lead.overallStatus, lead.cdbValidation, logFile);
          
          try {
            const cdbStatusStr = lead.cdbValidation === 'Passed' ? 'True' : 'False';
            const allConditionStr = lead.overallStatus === 'Passed' ? 'True' : 'False';
            await googleSheets.appendNonTestRow(targetUrlName, lead.leadId, cdbStatusStr, allConditionStr);
          } catch (sheetErr) {
            utils.writeLog(logFile, `Warning: Could not append to Google Sheet: ${sheetErr.message}`, 'WARN');
          }
        }
      }
    } else {
      utils.writeLog(logFile, 'No Lead IDs found to verify in CDB.', 'WARN');
    }

    // 6. Generate final validation report
    writeFinalReport(validationResults, targetUrlName, dateRange);

  } catch (err) {
    utils.writeLog(logFile, `FATAL ERROR: ${err.message}`, 'ERROR');
    console.error('Validation Process Failed:', err);
  } finally {
    if (browser) {
      await browser.close();
    }
    console.log('Browser closed. Process completed.');
  }
}

// Execute
runNonTestValidation();
