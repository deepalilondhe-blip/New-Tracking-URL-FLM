

const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');
const https = require('https');
const process = require('process');
const readline = require('readline');
const nodemailer = require('nodemailer');
require('dotenv').config({ path: path.resolve(__dirname, '..', '.env') });

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

function fetchPageHtml(url) {
  return new Promise((resolve, reject) => {
    https
      .get(url, (res) => {
        let html = '';
        res.on('data', (chunk) => {
          html += chunk;
        });
        res.on('end', () => resolve(html));
      })
      .on('error', reject);
  });
}

function extractElementsFromHtml(html) {
  const tags = ['input', 'button', 'select', 'a'];
  const regex = /<(input|button|select|a)\b([^>]*)>([\s\S]*?)<\/\1>|<(input|button|select|a)\b([^>]*)\/?>/gi;
  const readAttr = (attrs, name) => {
    const match = new RegExp(`${name}\\s*=\\s*["']([^"']*)["']`, 'i').exec(attrs || '');
    return match ? match[1] : '';
  };

  const results = [];
  let match;
  while ((match = regex.exec(html)) !== null) {
    const tag = (match[1] || match[4] || '').toUpperCase();
    if (!tags.includes(tag.toLowerCase())) continue;
    const attrs = match[2] || match[5] || '';
    const innerText = (match[3] || '').replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
    results.push({
      tag,
      type: readAttr(attrs, 'type'),
      id: readAttr(attrs, 'id'),
      name: readAttr(attrs, 'name'),
      placeholder: readAttr(attrs, 'placeholder'),
      className: readAttr(attrs, 'class'),
      text: innerText
    });
  }
  return results;
}

function getModeFromArgs() {
  const modeArg = process.argv.find((arg) => arg.startsWith('--mode='));
  if (!modeArg) return 'auto';
  const value = modeArg.split('=')[1];
  if (value === 'browser' || value === 'http' || value === 'auto') return value;
  throw new Error(`Invalid mode "${value}". Use --mode=auto|browser|http`);
}

function isHeadedRequested() {
  return process.argv.includes('--headed');
}

function isManualLoginEnabled() {
  return process.argv.includes('--manual-login');
}

function isPromptCredsEnabled() {
  return process.argv.includes('--prompt-creds');
}

function getArgValue(name) {
  const key = `--${name}=`;
  const arg = process.argv.find((a) => a.startsWith(key));
  return arg ? arg.slice(key.length) : '';
}

function getTargetUrl() {
  return getArgValue('url') || 'https://app.forwardleapmarketing.com/';
}

function isNonTestProcedureEnabled() {
  return process.argv.includes('--non-test-procedure');
}

function getAlertRecipient() {
  return getArgValue('alert-email') || 'urvish.patel@bytestechnolab.com';
}

function formatCakeDate(date) {
  return date.toLocaleDateString('en-US', {
    month: 'numeric',
    day: 'numeric',
    year: 'numeric'
  });
}

function getScheduledReportRange(referenceDate = new Date()) {
  const scheduledDays = new Set([1, 3, 5]); // Mon / Wed / Fri
  let schedDate = new Date(referenceDate);
  while (!scheduledDays.has(schedDate.getDay())) {
    schedDate.setDate(schedDate.getDate() - 1);
  }
  const dateStr = formatCakeDate(schedDate);
  return {
    startDate: dateStr,
    endDate: dateStr
  };
}

function getHoldSeconds() {
  const holdArg = process.argv.find((arg) => arg.startsWith('--hold='));
  if (!holdArg) return null;
  const value = Number(holdArg.split('=')[1]);
  if (Number.isFinite(value) && value >= 0) return value;
  throw new Error('Invalid --hold value. Use a non-negative number, e.g. --hold=30');
}

async function pauseInHeadedMode() {
  const holdSeconds = getHoldSeconds();
  if (holdSeconds !== null) {
    if (holdSeconds === 0) return;
    console.log(`Keeping browser open for ${holdSeconds} seconds...`);
    await new Promise((resolve) => setTimeout(resolve, holdSeconds * 1000));
    return;
  }

  console.log('Keeping browser open. Press Enter to close...');
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
  });
  await new Promise((resolve) => rl.question('', () => resolve()));
  rl.close();
}

function getCakeCredentials() {
  const cliUsername = getArgValue('username');
  const cliPassword = getArgValue('password');
  return {
    username: cliUsername || process.env.CAKE_USERNAME || '',
    password: cliPassword || process.env.CAKE_PASSWORD || ''
  };
}

function getOtpCode() {
  return getArgValue('otp') || process.env.CAKE_OTP || process.env.CAKE_OTP_CODE || '';
}

async function fillOtpIfPresent(page) {
  let otp = getOtpCode();

  const otpField = page
    .locator(
      '#mfacode, input[name="m"], input[name*="code" i], input[id*="code" i], input[placeholder*="code" i], input[name*="otp" i], input[id*="otp" i], input[placeholder*="otp" i], input[type="tel"]'
    )
    .first();

  const visible = await otpField.isVisible().catch(() => false);
  if (!visible) return false;

  if (!otp) {
    otp = await ask('Enter CAKE OTP: ');
  }
  if (!otp) return false;

  console.log('OTP field detected. Entering code...');
  await otpField.click();
  await otpField.fill('');
  await otpField.type(otp, { delay: 140 });
  await otpField.dispatchEvent('input');
  await otpField.dispatchEvent('change');
  await otpField.dispatchEvent('blur');

  // Some MFA pages use segmented OTP fields (one digit per box).
  // If multiple tel/text inputs are visible, distribute digits across them.
  const segmentedFields = page
    .locator('input[type="tel"], input[inputmode="numeric"], input[maxlength="1"]')
    .filter({ hasNot: page.locator('[name="u"], [name="p"]') });
  const count = await segmentedFields.count().catch(() => 0);
  if (count >= 4) {
    const digits = String(otp).replace(/\D/g, '').split('');
    const toFill = Math.min(count, digits.length);
    for (let i = 0; i < toFill; i++) {
      const field = segmentedFields.nth(i);
      const visibleSeg = await field.isVisible().catch(() => false);
      if (!visibleSeg) continue;
      await field.click().catch(() => {});
      await field.fill('').catch(() => {});
      await field.type(digits[i], { delay: 60 }).catch(() => {});
    }
  }
  return true;
}

async function isMfaPageVisible(page) {
  return await page
    .locator('#mfacode, input[name="m"], input[placeholder*="MFA" i], input[placeholder*="code" i]')
    .first()
    .isVisible()
    .catch(() => false);
}

async function clickTrust30DaysIfPresent(page) {
  const candidates = [
    page.getByLabel(/30\s*day/i),
    page.getByText(/30\s*day/i),
    page.getByLabel(/remember/i),
    page.getByLabel(/trust/i),
    page.getByText(/remember.*device/i)
  ];

  for (const locator of candidates) {
    const visible = await locator.first().isVisible().catch(() => false);
    if (!visible) continue;
    try {
      await locator.first().click();
      const checkbox = page.locator('#remembermfa, input[name="remembermfa"], input[type="checkbox"]').first();
      const checked = await checkbox.isChecked().catch(() => true);
      if (!checked) {
        await checkbox.check().catch(() => {});
      }
      const finalChecked = await checkbox.isChecked().catch(() => true);
      console.log(`Clicked 30-day/remember device option. Checked=${finalChecked}`);
      return finalChecked;
    } catch (_) {
      // Try next candidate
    }
  }
  return false;
}

async function submitOtpIfPresent(page) {
  const verifyBtn = page
    .locator(
      'button:has-text("Verify"), button:has-text("Submit"), button:has-text("Continue"), button:has-text("Log In"), input[type="submit"]'
    )
    .first();
  const visible = await verifyBtn.isVisible().catch(() => false);
  if (!visible) return false;
  await verifyBtn.focus().catch(() => {});
  await page.waitForTimeout(250);
  await verifyBtn.dispatchEvent('mousedown').catch(() => {});
  await verifyBtn.dispatchEvent('mouseup').catch(() => {});
  await verifyBtn.click({ delay: 80 });
  return true;
}

async function submitMfaWithRetry(page) {
  const rememberClicked = await clickTrust30DaysIfPresent(page);
  if (!rememberClicked) {
    console.log('Could not verify remember-device checkbox state.');
  }
  const filled = await fillOtpIfPresent(page);
  if (!filled) return { attempted: false, success: false, reason: 'OTP field not visible' };

  let submitted = await submitOtpIfPresent(page);
  if (!submitted) return { attempted: true, success: false, reason: 'OTP submit button not visible' };

  let outcome = await waitForLoginOutcome(page);
  if (outcome.success && !/OTP step detected/i.test(outcome.reason)) {
    return { attempted: true, success: true, reason: outcome.reason };
  }

  console.log('First MFA submit did not complete. Retrying once...');
  await page.waitForTimeout(1200);
  await fillOtpIfPresent(page);
  await clickTrust30DaysIfPresent(page);
  submitted = await submitOtpIfPresent(page);
  if (!submitted) return { attempted: true, success: false, reason: 'OTP retry submit button not visible' };
  outcome = await waitForLoginOutcome(page);
  if (outcome.success && !/OTP step detected/i.test(outcome.reason)) {
    return { attempted: true, success: true, reason: outcome.reason };
  }
  return { attempted: true, success: false, reason: outcome.reason };
}

async function ask(question) {
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  const answer = await new Promise((resolve) => rl.question(question, resolve));
  rl.close();
  return (answer || '').trim();
}

async function isLoginVisible(page) {
  const loginButton = page.locator('#submitButton, button:has-text("Log In")').first();
  return await loginButton.isVisible().catch(() => false);
}

async function waitForLoginOutcome(page) {
  const timeoutMs = 60000;
  const start = Date.now();
  const initialUrl = page.url();

  while (Date.now() - start < timeoutMs) {
    const loginVisible = await isLoginVisible(page);
    const url = page.url();
    const buttonText = await page
      .locator('#submitButton, button:has-text("Log In"), button:has-text("Attempting Login")')
      .first()
      .innerText()
      .catch(() => '');
    const otpVisible = await page
      .locator('input[name*="code" i], input[id*="code" i], input[placeholder*="code" i], input[name*="otp" i], input[id*="otp" i], input[placeholder*="otp" i]')
      .first()
      .isVisible()
      .catch(() => false);

    if (otpVisible) {
      return { success: true, reason: 'OTP step detected' };
    }

    const leftLoginRoute = url !== initialUrl && !/app\.forwardleapmarketing\.com\/?$/.test(url);
    if (!loginVisible && leftLoginRoute) {
      return { success: true, reason: `Authenticated route reached: ${url}` };
    }

    if (/attempting login/i.test(buttonText)) {
      // Still processing; continue polling.
    }

    await page.waitForTimeout(500);
  }

  const url = page.url();
  const buttonText = await page
    .locator('#submitButton, button:has-text("Log In"), button:has-text("Attempting Login")')
    .first()
    .innerText()
    .catch(() => '');
  const loginVisible = await isLoginVisible(page);
  const leftLoginRoute = url !== initialUrl && !/app\.forwardleapmarketing\.com\/?$/.test(url);
  if (!loginVisible && leftLoginRoute) {
    return {
      success: true,
      reason: `Authenticated route reached after wait: ${url}`
    };
  }
  return {
    success: false,
    reason: `Login did not complete within 30s. URL=${url} loginVisible=${loginVisible} buttonText="${buttonText}"`
  };
}

async function loginIfRequired(page) {
  if (await isMfaPageVisible(page)) {
    console.log('MFA page detected directly. Handling remember-device checkbox.');
    const mfaResult = await submitMfaWithRetry(page);
    if (!mfaResult.attempted) return { attempted: true, completed: false };
    if (!mfaResult.success) throw new Error(`OTP submit failed: ${mfaResult.reason}`);
    console.log(`OTP outcome: ${mfaResult.reason}`);
    return { attempted: true, completed: true };
  }

  let { username, password } = getCakeCredentials();
  const loginVisible = await isLoginVisible(page);
  if (!loginVisible) {
    console.log('Already logged in. Login form is not visible.');
    return { attempted: false, completed: true };
  }

  if ((!username || !password) && isPromptCredsEnabled()) {
    if (!username) username = await ask('Enter CAKE username: ');
    if (!password) password = await ask('Enter CAKE password: ');
  }

  if (!username || !password) {
    if (!isManualLoginEnabled()) {
      console.log('Login form visible and credentials not provided. Skipping automated login for this run.');
      return { attempted: false, completed: false };
    }
    console.log('Manual login mode enabled. Please log in in the opened browser window.');
    await pauseInHeadedMode();
    await page.waitForLoadState('networkidle');
    return { attempted: true, completed: true };
  }

  console.log('Login form detected. Signing in...');
  const usernameField = page.locator('#u, input[name="u"], input[type="text"]').first();
  const passwordField = page.locator('#password, input[name="p"], input[type="password"]').first();
  const loginButton = page.locator('#submitButton, button:has-text("Log In"), input[type="submit"]').first();

  await usernameField.waitFor({ state: 'visible', timeout: 15000 });
  await passwordField.waitFor({ state: 'visible', timeout: 15000 });
  await loginButton.waitFor({ state: 'visible', timeout: 15000 });

  await usernameField.click();
  await usernameField.fill('');
  await usernameField.type(username, { delay: 40 });

  await passwordField.click();
  await passwordField.fill('');
  await passwordField.type(password, { delay: 40 });

  console.log('Credentials entered. Clicking Log In...');
  await loginButton.click();
  const outcome = await waitForLoginOutcome(page);
  if (!outcome.success) {
    throw new Error(outcome.reason);
  }
  console.log(`Login outcome: ${outcome.reason}`);

  const otpFilled = await fillOtpIfPresent(page);
  if (otpFilled) {
    const mfaResult = await submitMfaWithRetry(page);
    if (!mfaResult.success) {
      throw new Error(`OTP submit failed: ${mfaResult.reason}`);
    }
    console.log(`OTP outcome: ${mfaResult.reason}`);
  }
  return { attempted: true, completed: true };
}

async function clickIfVisible(locator, timeout = 6000) {
  const visible = await locator.first().isVisible({ timeout }).catch(() => false);
  if (!visible) return false;
  await locator.first().click().catch(() => {});
  return true;
}

async function navigateToConversionReport(page) {
  const reportsLink = page.locator('a[href="newrep.aspx"], a:has-text("REPORTS")').first();
  const reportsClicked = await reportsLink.isVisible().catch(() => false);
  if (!reportsClicked) {
    throw new Error('Could not find REPORTS link.');
  }

  await reportsLink.click().catch(async () => {
    await page.getByText('REPORTS', { exact: true }).click();
  });
  await page.waitForLoadState('networkidle').catch(() => {});
  await page.waitForTimeout(1500);

  const conversionsItem = page.locator('.secondary-menu-item-text, .secondary-menu-item-container').filter({ hasText: /^Conversions$/i }).first();
  const conversionsVisible = await conversionsItem.isVisible().catch(() => false);
  if (!conversionsVisible) {
    throw new Error('Could not find Conversions menu item.');
  }

  await conversionsItem.click().catch(async () => {
    await page.getByText('Conversions', { exact: true }).click();
  });
  await page.waitForLoadState('networkidle').catch(() => {});
  await page.waitForTimeout(1800);
  await page.waitForFunction(() => {
    const body = document.body ? document.body.innerText : '';
    return body.includes('Conversion Report') && body.includes('Start') && body.includes('End');
  }).catch(() => {});
}

async function setReportDateRange(page, startDate, endDate) {
  const dateInputs = await page.evaluate(() => {
    const visible = (el) => {
      const s = window.getComputedStyle(el);
      const r = el.getBoundingClientRect();
      return s.display !== 'none' && s.visibility !== 'hidden' && r.width > 0 && r.height > 0;
    };
    const isDateLike = (value) => /^\d{1,2}\/\d{1,2}\/\d{4}$/.test((value || '').trim());
    return Array.from(document.querySelectorAll('input'))
      .filter((el) => visible(el) && isDateLike(el.value))
      .map((el) => {
        const r = el.getBoundingClientRect();
        return {
          id: el.id || '',
          name: el.name || '',
          value: el.value || '',
          x: r.x
        };
      })
      .sort((a, b) => a.x - b.x);
  });

  if (dateInputs.length < 2) {
    throw new Error('Could not locate the Start and End date inputs on the conversion report.');
  }

  const startInput = dateInputs[0];
  const endInput = dateInputs[1];
  const startLocator = startInput.id ? page.locator(`#${startInput.id}`).first() : page.locator(`input[name="${startInput.name}"]`).first();
  const endLocator = endInput.id ? page.locator(`#${endInput.id}`).first() : page.locator(`input[name="${endInput.name}"]`).first();

  await startLocator.click().catch(() => {});
  await startLocator.fill(startDate).catch(() => {});
  await startLocator.press('Enter').catch(() => {});

  await endLocator.click().catch(() => {});
  await endLocator.fill(endDate).catch(() => {});
  await endLocator.press('Enter').catch(() => {});

  console.log(`Selected report date range: ${startDate} -> ${endDate}`);

  // Click the Filter button to reload the grid with selected dates
  const filterClicked = await page.evaluate(() => {
    const filterTd = Array.from(document.querySelectorAll('td.x-btn-mc')).find(td => td.innerText.includes('Filter'));
    if (filterTd) {
      const btn = filterTd.querySelector('button') || filterTd;
      btn.click();
      return true;
    }
    return false;
  });

  if (filterClicked) {
    console.log('Clicked Filter button to apply date range.');
  } else {
    console.warn('Filter button not found.');
  }

  await page.waitForTimeout(5000);
}

async function setAffiliateFilter(page, affiliateName) {
  console.log(`Setting Affiliate filter to: "${affiliateName}"...`);
  
  const affiliateInputFound = await page.evaluate(async (name) => {
    const visible = (el) => {
      const s = window.getComputedStyle(el);
      const r = el.getBoundingClientRect();
      return s.display !== 'none' && s.visibility !== 'hidden' && r.width > 0 && r.height > 0;
    };
    
    // Find the input element that contains "All Affiliates", "QA affiliate" or whose parent label is "Affiliate"
    const inputs = Array.from(document.querySelectorAll('input.x-form-field'));
    const affInput = inputs.find(i => {
      if (!visible(i)) return false;
      const val = (i.value || '').trim();
      if (/All Affiliates|QA affiliate/i.test(val)) return true;
      const label = i.closest('.x-form-item') ? i.closest('.x-form-item').querySelector('label') : null;
      if (label && /Affiliate/i.test(label.textContent)) return true;
      return false;
    });

    if (!affInput) return false;
    
    affInput.focus();
    affInput.value = '';
    
    // Type name characters with small delay
    for (let char of name) {
      affInput.value += char;
      affInput.dispatchEvent(new Event('input', { bubbles: true }));
      affInput.dispatchEvent(new Event('keyup', { bubbles: true }));
      await new Promise(r => setTimeout(r, 50));
    }
    affInput.dispatchEvent(new Event('change', { bubbles: true }));
    return true;
  }, affiliateName);

  if (!affiliateInputFound) {
    console.warn('Could not locate the Affiliate input via ExtJS selectors.');
  } else {
    await page.waitForTimeout(2000);
    
    // Locate the dropdown option matching the affiliateName
    const dropdownClicked = await page.evaluate((name) => {
      const items = Array.from(document.querySelectorAll('.x-combo-list-item'));
      const target = items.find(el => new RegExp(name, 'i').test(el.textContent));
      if (target) {
        target.click();
        return true;
      }
      return false;
    }, affiliateName);
    
    if (dropdownClicked) {
      console.log(`✓ Clicked autocomplete dropdown option matching "${affiliateName}".`);
    } else {
      console.warn(`✗ Autocomplete option matching "${affiliateName}" not found in dropdown list.`);
    }
  }

  // Click the Filter button to apply the affiliate selection to the grid
  const filterClicked = await page.evaluate(() => {
    const filterTd = Array.from(document.querySelectorAll('td.x-btn-mc')).find(td => td.innerText.includes('Filter'));
    if (filterTd) {
      const btn = filterTd.querySelector('button') || filterTd;
      btn.click();
      return true;
    }
    return false;
  });

  if (filterClicked) {
    console.log('✓ Filter button clicked to apply Affiliate filter.');
  } else {
    console.warn('✗ Filter button not found after choosing Affiliate.');
  }

  await page.waitForTimeout(6000);
}

async function ensureTestsAndNonTestsFilter(page) {
  const timeoutMs = 15000;
  const start = Date.now();

  while (Date.now() - start < timeoutMs) {
    const bodyHasFilter = await page.evaluate(() => {
      const normalize = (text) => (text || '').replace(/\s+/g, ' ').trim();
      return Array.from(document.querySelectorAll('input, select, option, button, span, div'))
        .some((el) => {
          const text = normalize(el.innerText || el.textContent || el.value || '');
          return /^Tests?\s*&\s*Non-Tests?$/i.test(text);
        });
    }).catch(() => false);
    if (bodyHasFilter) {
      console.log('Tests & Non-Tests filter visible.');
      return true;
    }

    const exactControl = page.locator('input[value="Tests & Non-Tests"], input[value="Test & Non-Tests"]').first();
    if (await exactControl.isVisible().catch(() => false)) {
      const currentValue = await exactControl.inputValue().catch(() => '');
      console.log(`Tests filter selected: ${currentValue || 'Tests & Non-Tests'}`);
      return true;
    }

    const selectedOption = page.locator('select option:checked').filter({ hasText: /Tests?\s*&\s*Non-Tests?/i }).first();
    if (await selectedOption.isVisible().catch(() => false)) {
      const currentValue = await selectedOption.textContent().catch(() => '');
      console.log(`Tests filter selected: ${(currentValue || 'Tests & Non-Tests').trim()}`);
      return true;
    }

    const exactLabel = page.getByText(/^Tests?\s*&\s*Non-Tests?$/i).first();
    if (await exactLabel.isVisible().catch(() => false)) {
      console.log('Tests & Non-Tests filter visible.');
      return true;
    }

    await page.waitForTimeout(500);
  }

  console.warn('Could not verify Tests & Non-Tests filter.');
  return false;
}

async function triggerBrowserFind(page, term) {
  try {
    await page.mouse.click(20, 20).catch(() => {});
    await page.waitForTimeout(150);
    await page.keyboard.press(process.platform === 'darwin' ? 'Meta+f' : 'Control+f');
    await page.waitForTimeout(300);
    await page.keyboard.type(term, { delay: 30 });
    await page.waitForTimeout(800);
    console.log(`Browser find triggered for: ${term}`);
    return true;
  } catch (error) {
    console.warn(`Could not trigger browser find for "${term}": ${error.message}`);
    return false;
  }
}

async function readFooterPageCount(page) {
  const parsed = await page.evaluate(() => {
    const normalize = (text) => (text || '').replace(/\s+/g, ' ').trim();
    const isVisible = (el) => {
      if (!el) return false;
      const style = window.getComputedStyle(el);
      const rect = el.getBoundingClientRect();
      return style.display !== 'none' && style.visibility !== 'hidden' && rect.width > 0 && rect.height > 0;
    };

    const pageInput = document.querySelector('input.x-tbar-page-number');
    const currentPage = pageInput ? parseInt(pageInput.value, 10) : 1;

    let totalPages = 1;
    const toolbar = document.querySelector('.x-panel-bbar, .x-toolbar');
    let footerText = '';
    if (toolbar) {
      footerText = normalize(toolbar.innerText || '');
      const match = footerText.match(/of\s+(\d+)/i);
      if (match) totalPages = parseInt(match[1], 10);
    }

    const displayingMatch = footerText.match(/Displaying\s+Items\s+(\d+)\s*-\s*(\d+)\s+of\s+(\d+)/i);

    return {
      footerText,
      currentPage,
      totalPages,
      displayingFrom: displayingMatch ? Number(displayingMatch[1]) : null,
      displayingTo: displayingMatch ? Number(displayingMatch[2]) : null,
      totalItems: displayingMatch ? Number(displayingMatch[3]) : null
    };
  }).catch(() => null);

  if (parsed) return parsed;

  return {
    footerText: '',
    currentPage: 1,
    totalPages: 1,
    displayingFrom: null,
    displayingTo: null,
    totalItems: null
  };
}

async function locateQaAffiliateRow(page) {
  await page.waitForFunction(() => {
    const rows = Array.from(document.querySelectorAll('table tr'));
    return rows.some((row) => /qa affiliate/i.test(row.innerText || ''));
  }, { timeout: 30000 }).catch(() => {});

  const timeoutMs = 15000;
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    const row = page.locator('table tr').filter({ hasText: /qa affiliate/i }).first();
    const visible = await row.isVisible().catch(() => false);
    if (visible) {
      await row.scrollIntoViewIfNeeded().catch(() => {});
      await page.waitForTimeout(500);
      return row;
    }
    await page.waitForTimeout(750);
  }
  throw new Error('Could not locate QA Affiliate row in the conversion grid.');
}

async function extractRedQaLeadIds(page) {
  const rows = await page.evaluate(() => {
    const normalize = (s) => (s || '').replace(/\s+/g, ' ').trim();
    const redLike = (color) => {
      if (!color) return false;
      const c = color.toLowerCase();
      return c.includes('rgb(255, 0, 0)') || c.includes('rgb(220') || c.includes('red');
    };

    const allRows = Array.from(document.querySelectorAll('tr, .x-grid3-row'));
    const findings = [];

    // Locate column indices dynamically
    const headerCells = Array.from(document.querySelectorAll('.x-grid3-hd-inner, .x-grid3-header td, th'));
    const testColIndex = headerCells.findIndex(el => el.textContent.trim().toLowerCase() === 'test');
    const pixelColIndex = headerCells.findIndex(el => el.textContent.trim().toLowerCase() === 'pixel');
    
    const testIdx = testColIndex !== -1 ? testColIndex : 20;
    const pixelIdx = pixelColIndex !== -1 ? pixelColIndex : 17;

    for (const tr of allRows) {
      const tds = Array.from(tr.querySelectorAll('td'));
      if (!tds.length) continue;
      const rowText = normalize(tr.textContent || '');
      
      // Mimic Ctrl+F search for "QA Affiliate"
      if (!/qa affiliate/i.test(rowText)) continue;

      let hasRed = false;

      // 1. Check Test column for red (inactive) indicator
      const testTd = tds[testIdx];
      if (testTd) {
        const img = testTd.querySelector('img');
        if (img && (img.src || img.getAttribute('src') || '').toLowerCase().includes('inactive')) {
          hasRed = true;
        }
      }

      // 2. Check Pixel column for red (inactive) indicator
      if (!hasRed) {
        const pixelTd = tds[pixelIdx];
        if (pixelTd) {
          const img = pixelTd.querySelector('img');
          if (img && (img.src || img.getAttribute('src') || '').toLowerCase().includes('inactive')) {
            hasRed = true;
          }
        }
      }

      // 3. Fallback CSS color rules check
      if (!hasRed) {
        for (const td of tds) {
          const nodes = [td, ...Array.from(td.querySelectorAll('*'))];
          for (const node of nodes) {
            const styles = window.getComputedStyle(node);
            if (redLike(styles.color) || redLike(styles.backgroundColor) || redLike(styles.borderColor)) {
              hasRed = true;
              break;
            }
          }
          if (hasRed) break;
        }
      }

      if (!hasRed) continue;

      const rowId = tr.getAttribute('row-id') || tr.getAttribute('data-row-id') || tr.getAttribute('comp-id') || '';
      const affiliate = normalize((tds[0] && tds[0].textContent) || '');
      const manager = normalize((tds[1] && tds[1].textContent) || '');
      
      // Extract Lead ID exactly from the first cell's link, or fallback to regex
      let leadId = '';
      if (tds[0]) {
        const link = tds[0].querySelector('a');
        if (link) {
          leadId = normalize(link.textContent || '');
        }
      }
      if (!leadId) {
        const leadIdMatch = rowText.match(/\b[A-Z0-9]{8,12}\b/g) || [];
        leadId = leadIdMatch[0] || rowId || 'Unknown';
      }

      findings.push({
        rowId,
        affiliate,
        manager,
        rowText,
        leadIds: [leadId]
      });
    }

    return findings;
  });

  const leadIds = [...new Set(rows.flatMap(r => r.leadIds || []))];
  return { leadIds, rows };
}

async function sendLeadAlertEmail(records, recipient) {
  if (!records.length) {
    console.log('No red QA Affiliate leads found. No email sent.');
    return;
  }

  const host = process.env.SMTP_HOST;
  const port = parseInt(process.env.SMTP_PORT || '587', 10);
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;
  const secure = String(process.env.SMTP_SECURE || 'false').toLowerCase() === 'true';

  if (!host || !user || !pass) {
    console.warn('SMTP credentials are missing in .env. Cannot send alert email.');
    console.log(`Lead IDs to notify (${recipient}): ${records.map(r => r.leadIds.join(', ')).join(' | ')}`);
    return;
  }

  const transporter = nodemailer.createTransport({
    host,
    port,
    secure,
    auth: { user, pass }
  });

  const subject = `Cake QA Alert: ${records.length} red QA row(s)`;
  const html = `
    <p>QA Affiliate review found red entries in Test column.</p>
    <p><b>Rows:</b></p>
    <ul>
      ${records.map((r) => `
        <li>
          <b>Unique ID:</b> ${r.leadIds.join(', ')}<br/>
          <b>Affiliate:</b> ${r.affiliate || 'N/A'}<br/>
          <b>Manager:</b> ${r.manager || 'N/A'}<br/>
          <b>Row:</b> ${r.rowText}
        </li>
      `).join('')}
    </ul>
  `;

  await transporter.sendMail({
    from: `"FLM Cake Monitor" <${user}>`,
    to: recipient,
    subject,
    html
  });

  console.log(`Alert email sent to ${recipient} with ${records.length} red row(s).`);
}

(async () => {
  try {
    console.log('Navigating to Cake login page...');
    const url = getTargetUrl();
    const mode = getModeFromArgs();
    const headed = isHeadedRequested();
    const manualLogin = isManualLoginEnabled();
    console.log(`Run mode: ${mode}`);
    console.log(`Headed requested: ${headed}`);
    console.log(`Manual login mode: ${manualLogin}`);

    const runHttpMode = async () => {
      const html = await fetchPageHtml(url);
      fs.writeFileSync(path.join(__dirname, 'cake_login.html'), html, 'utf8');
      console.log('HTML saved to:', path.join(__dirname, 'cake_login.html'));
      const inputs = extractElementsFromHtml(html);
      console.log('Form elements found (HTML fallback):', JSON.stringify(inputs, null, 2));
    };

    if (mode === 'http') {
      await runHttpMode();
      return;
    }

    let browser;
    let context;
    try {
      browser = await launchBrowser(headed);
      const storageStatePath = path.join(__dirname, 'cake-auth-state.json');
      context = await browser.newContext({
        storageState: fs.existsSync(storageStatePath) ? storageStatePath : undefined
      });
      const page = await context.newPage();
      page.setDefaultTimeout(30000);
      page.on('dialog', async dialog => {
        console.log('🛑 Browser dialog detected: ' + dialog.message());
        await dialog.dismiss().catch(() => {});
      });
      await page.goto(url);
      await page.waitForLoadState('networkidle');
      console.log('Current URL:', page.url());

      const loginResult = await loginIfRequired(page);
      if (loginResult.completed) {
        await context.storageState({ path: storageStatePath });
        console.log('Session saved to:', storageStatePath);
      }

      const loginStillVisible = await isLoginVisible(page);
      console.log(`Login button visible after checks: ${loginStillVisible}`);

      if (loginResult.completed) {
        await page.waitForTimeout(3000);
        await page.waitForLoadState('networkidle').catch(() => {});
      }

      if (!loginResult.completed && loginStillVisible) {
        console.log('Home page not opened automatically because credentials/session are not available yet.');
      }

      if (loginResult.completed && isNonTestProcedureEnabled()) {
        console.log('Starting Non-Test procedure...');
        await navigateToConversionReport(page);
        const { startDate, endDate } = getScheduledReportRange(new Date());
        await setReportDateRange(page, startDate, endDate);
        await ensureTestsAndNonTestsFilter(page);

        // Do NOT filter affiliate dropdown. Perform DOM page-by-page search instead.
        let allRedRows = [];
        let allLeadIds = [];
        let currentPage = 1;
        let totalPages = 1;

        // Get initial page counts
        const initialFooter = await readFooterPageCount(page);
        totalPages = initialFooter.totalPages || 1;
        console.log(`Total grid pages to check: ${totalPages}`);

        do {
          console.log(`Scanning page ${currentPage} of ${totalPages}...`);
          await page.waitForTimeout(2000);

          const pageResult = await extractRedQaLeadIds(page);
          console.log(`Page ${currentPage} check found ${pageResult.leadIds.length} red QA leads.`);

          allRedRows.push(...pageResult.rows);
          allLeadIds.push(...pageResult.leadIds);

          const pageInfo = await readFooterPageCount(page);
          currentPage = pageInfo.currentPage || currentPage;
          totalPages = pageInfo.totalPages || totalPages;

          if (currentPage < totalPages) {
            console.log(`Moving to next page (${currentPage + 1}/${totalPages})...`);
            const nextBtn = page.locator('.x-tbar-page-next, button:has-text("Next")').filter({ visible: true }).first();
            const nextVisible = await nextBtn.isVisible().catch(() => false);
            const nextDisabled = nextVisible ? await nextBtn.evaluate((el) => {
              return el.disabled || 
                     el.classList.contains('x-item-disabled') || 
                     el.closest('.x-item-disabled') !== null || 
                     el.closest('.x-btn-disabled') !== null;
            }).catch(() => true) : true;

            if (nextVisible && !nextDisabled) {
              await nextBtn.click();
              currentPage++;
              await page.waitForTimeout(4000);
            } else {
              console.log('Next page button is disabled or not visible. Exiting pagination.');
              break;
            }
          } else {
            break;
          }
        } while (currentPage <= totalPages);

        const finalLeadIds = [...new Set(allLeadIds)];
        const result = {
          leadIds: finalLeadIds,
          rows: allRedRows
        };

        const output = {
          checkedAt: new Date().toISOString(),
          reportPage: 'newrep.aspx',
          dateRange: { startDate, endDate },
          browserFind: { triggered: true, term: 'QA Affiliate' },
          footerPageCount: {
            currentPage,
            totalPages,
            totalItems: allRedRows.length
          },
          qaAffiliateRowFound: allRedRows.length > 0,
          redRows: result
        };

        const outputPath = path.join(__dirname, 'cake_non_test_results.json');
        fs.writeFileSync(outputPath, JSON.stringify(output, null, 2), 'utf8');
        console.log(`Non-Test results saved to: ${outputPath}`);

        // Only send email if we found actual red rows
        if (finalLeadIds.length > 0) {
          console.log(`Alerting developer of ${finalLeadIds.length} red QA lead(s)...`);
          await sendLeadAlertEmail(allRedRows, getAlertRecipient());
        } else {
          console.log('All QA Affiliate leads verified: no red cells in Test column found. No alert email needed.');
        }
      }

      const screenshotPath = path.join(__dirname, 'cake_login.png');
      await page.screenshot({ path: screenshotPath, fullPage: true });
      console.log('Screenshot saved to:', screenshotPath);

      const inputs = await page.evaluate(() => {
        return Array.from(document.querySelectorAll('input, button, select, a')).map(el => ({
          tag: el.tagName,
          type: el.type || '',
          id: el.id || '',
          name: el.name || '',
          placeholder: el.placeholder || '',
          className: el.className || '',
          text: el.innerText || el.value || ''
        }));
      });
      console.log('Form elements found:', JSON.stringify(inputs, null, 2));

      if (headed) {
        await pauseInHeadedMode();
      }
    } catch (launchError) {
      const launchText = String(launchError?.message || launchError);
      const looksLikeLaunchFailure = /spawn|browserType\.launch|executable|not found|launch/i.test(launchText);
      if (mode === 'browser' || !looksLikeLaunchFailure) {
        throw launchError;
      }
      console.warn(`Playwright launch failed, using HTTP fallback: ${launchText}`);
      await runHttpMode();
    } finally {
      if (context) {
        await context.close();
      }
      if (browser) {
        await browser.close();
      }
    }
  } catch (error) {
    console.error('Error during inspection:', error.message);
  }
})();

