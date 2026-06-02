const fs = require('fs');
const path = require('path');
const { chromium } = require('playwright');
require('dotenv').config({ path: path.resolve(__dirname, '..', '..', '.env') });
const { appendFinalValidationRow } = require('../googleSheetsUtils');

const CONFIG = {
  CAKE_LOGIN_URL: 'https://app.forwardleapmarketing.com/?lm_id=sessionexpired',
  CAKE_HOME_URL: 'https://app.forwardleapmarketing.com/newaffl.aspx',
  CDB_LOGIN_URL: 'https://www.flmreporting.com/flm_central_leads/auth/login.php',
  SLOW_MO_MS: Number(process.env.FLM_SLOW_MO_MS || 700),
  REVIEW_PAUSE_MS: Number(process.env.FLM_REVIEW_PAUSE_MS || 2500),
  CAKE_USERNAME: process.env.CAKE_USERNAME || 'urvish.patel@bytestechnolab.com',
  CAKE_PASSWORD: process.env.CAKE_PASSWORD || 'Urvish@123#2026-05',
  CDB_EMAIL: process.env.CDB_EMAIL || 'nirav.dobariya@bytestechnolab.com',
  CDB_PASSWORD: process.env.CDB_PASSWORD || 'Nirav@1234'
};

/**
 * FLM Agent – Validate Latest Lead
 * Extracts latest Lead ID from scheduler logs
 * Validates in Cake and CDB systems
 * Appends results to month-based dashboard
 */

async function findLatestSchedulerLog() {
  const logsDir = path.join(__dirname, '..', '..', 'logs', 'scheduler');
  if (!fs.existsSync(logsDir)) return null;
  
  const files = fs.readdirSync(logsDir)
    .filter(f => f.startsWith('scheduler_run_'))
    .map(f => ({ 
      f, 
      t: fs.statSync(path.join(logsDir, f)).mtime.getTime() 
    }))
    .sort((a, b) => b.t - a.t);
    
  return files.length ? path.join(logsDir, files[0].f) : null;
}

function getSortedSchedulerLogs() {
  const logsDir = path.join(__dirname, '..', '..', 'logs', 'scheduler');
  if (!fs.existsSync(logsDir)) return [];
  return fs.readdirSync(logsDir)
    .filter(f => f.startsWith('scheduler_run_'))
    .map(f => ({
      file: path.join(logsDir, f),
      name: f,
      mtime: fs.statSync(path.join(logsDir, f)).mtime.getTime()
    }))
    .sort((a, b) => b.mtime - a.mtime);
}

function extractLastLeadIdFromLog(content) {
  // Match leadid from JSON logs or URL parameters
  const regex = /leadid\"\s*:\s*\"([A-Z0-9]+)\"/ig;
  let match, last = null;
  while ((match = regex.exec(content)) !== null) {
    last = match[1];
  }
  return last;
}

function findLatestLeadIdFromSchedulerLogs() {
  const logs = getSortedSchedulerLogs();
  for (const log of logs) {
    const content = fs.readFileSync(log.file, 'utf8');
    const leadId = extractLastLeadIdFromLog(content);
    if (leadId) {
      return { leadId, logFile: log.file, logName: log.name, mtime: log.mtime };
    }
  }
  return null;
}

function isSameLocalDate(a, b) {
  return a.getFullYear() === b.getFullYear()
    && a.getMonth() === b.getMonth()
    && a.getDate() === b.getDate();
}

function previousOrSameTargetWeekday(now = new Date()) {
  // Monday=1, Wednesday=3, Friday=5 in JS Date.getDay().
  const targets = [1, 3, 5];
  let bestDiff = Infinity;
  let bestTarget = 5;
  for (const t of targets) {
    const diff = (now.getDay() - t + 7) % 7;
    if (diff < bestDiff) {
      bestDiff = diff;
      bestTarget = t;
    }
  }
  const target = new Date(now);
  target.setDate(now.getDate() - bestDiff);
  return target;
}

function isTargetSchedulerDay(date) {
  const day = date.getDay();
  return day === 1 || day === 3 || day === 5;
}

function findLatestLeadIdForSchedulerCycle(now = new Date()) {
  const cycleDate = previousOrSameTargetWeekday(now);
  const logs = getSortedSchedulerLogs();

  // First preference: same exact cycle date.
  for (const log of logs) {
    const logDate = new Date(log.mtime);
    if (!isSameLocalDate(logDate, cycleDate)) continue;
    const content = fs.readFileSync(log.file, 'utf8');
    const leadId = extractLastLeadIdFromLog(content);
    if (leadId) {
      return { leadId, logFile: log.file, logName: log.name, mtime: log.mtime, cycleDate };
    }
  }

  // Fallback: latest available Mon/Wed/Fri log with a lead ID.
  for (const log of logs) {
    const logDate = new Date(log.mtime);
    if (!isTargetSchedulerDay(logDate)) continue;
    const content = fs.readFileSync(log.file, 'utf8');
    const leadId = extractLastLeadIdFromLog(content);
    if (leadId) {
      return { leadId, logFile: log.file, logName: log.name, mtime: log.mtime, cycleDate: logDate };
    }
  }

  return null;
}

function computeAlternateDay(date) {
  const result = new Date(date);
  result.setDate(result.getDate() + 2);
  return result;
}

async function waitForAny(page, selectors, timeout = 10000) {
  for (const selector of selectors) {
    const locator = page.locator(selector).first();
    const visible = await locator.isVisible({ timeout }).catch(() => false);
    if (visible) return locator;
  }
  return null;
}

async function visiblePause(page, label, ms = CONFIG.REVIEW_PAUSE_MS) {
  console.log(`⏳ Review pause (${label}) - ${ms}ms`);
  await page.waitForTimeout(ms);
}

function getLocalDashboardPaths() {
  const now = new Date();
  const monthName = now.toLocaleString('en-US', { month: 'long' });
  const year = now.getFullYear();
  const monthNumber = now.getMonth() + 1;
  const baseDir = path.join(__dirname, '..', '..', 'FML_Project_Dashboard');
  const monthDir = path.join(baseDir, `${monthName}_${year}`);
  const sheetPath = path.join(monthDir, `Sheet_${monthNumber}_${year}.csv`);
  return { baseDir, monthDir, sheetPath };
}

function appendToLocalDashboardCsv(record) {
  const { monthDir, sheetPath } = getLocalDashboardPaths();
  if (!fs.existsSync(monthDir)) fs.mkdirSync(monthDir, { recursive: true });
  const header = 'URL,LeadID,Validation Status,CDB Status,Execution Date';
  if (!fs.existsSync(sheetPath)) {
    fs.writeFileSync(sheetPath, `${header}\n`, 'utf8');
    console.log(`✅ Created local dashboard sheet: ${sheetPath}`);
  } else {
    const existing = fs.readFileSync(sheetPath, 'utf8');
    const firstLine = (existing.split(/\r?\n/)[0] || '').trim();
    if (firstLine !== header) {
      const backupPath = sheetPath.replace('.csv', `_backup_${Date.now()}.csv`);
      fs.copyFileSync(sheetPath, backupPath);
      fs.writeFileSync(sheetPath, `${header}\n`, 'utf8');
      console.log(`ℹ️ Existing local dashboard had old format; backup created: ${backupPath}`);
      console.log(`✅ Local dashboard header reset to required format`);
    }
  }

  const esc = (v) => `"${String(v ?? '').replace(/"/g, '""')}"`;
  const line = [
    esc(record.url),
    esc(record.leadId),
    esc(record.validationStatus),
    esc(record.cdbStatus),
    esc(record.executionDate)
  ].join(',');
  fs.appendFileSync(sheetPath, `${line}\n`, 'utf8');
  console.log(`✅ Appended local dashboard row: ${sheetPath}`);
  return sheetPath;
}

async function loginToCake(page) {
  await page.goto(CONFIG.CAKE_LOGIN_URL, { waitUntil: 'domcontentloaded', timeout: 30000 });

  const userInput = await waitForAny(page, ['#u', 'input[name="u"]', 'input[type="email"]'], 10000);
  const passInput = await waitForAny(page, ['#password', 'input[name="p"]', 'input[type="password"]'], 10000);
  const loginBtn = page.locator('#submitButton, button:has-text("Log In"), button:has-text("Login")').first();

  if (!userInput || !passInput) {
    throw new Error('Cake login fields were not found');
  }

  await userInput.fill(CONFIG.CAKE_USERNAME);
  await passInput.fill(CONFIG.CAKE_PASSWORD);
  if (await loginBtn.count()) {
    await loginBtn.click().catch(async () => passInput.press('Enter'));
  } else {
    await passInput.press('Enter');
  }

  await page.waitForLoadState('domcontentloaded', { timeout: 15000 }).catch(() => {});
  await page.waitForURL(/forwardleapmarketing\.com/i, { timeout: 15000 }).catch(() => {});
  await visiblePause(page, 'Cake logged in');
}

async function openCakeAndSearchLead(page, leadId) {
  async function locateSearchInputInContext(ctx) {
    const selectors = [
      'input[placeholder*="Search"]',
      'input[aria-label*="Search"]',
      'input[type="search"]',
      'input[name*="search" i]'
    ];
    for (const sel of selectors) {
      const loc = ctx.locator(sel).first();
      if (await loc.count().catch(() => 0)) return loc;
    }
    return null;
  }

  let searchInput = await waitForAny(page, [
    'input[placeholder*="Search"]',
    'input[aria-label*="Search"]',
    'input[type="search"]',
    'input[name*="search" i]'
  ], 12000);

  // Try authenticated Cake pages only if search is not visible on current page.
  if (!searchInput) {
    const candidateUrls = [
      CONFIG.CAKE_HOME_URL,
      'https://app.forwardleapmarketing.com/newrep.aspx',
      'https://app.forwardleapmarketing.com/'
    ];
    for (const url of candidateUrls) {
      try {
        await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 30000 });
      } catch (err) {
        console.warn(`Cake page open retry for ${url}: ${err.message}`);
      }
      searchInput = await locateSearchInputInContext(page);
      if (searchInput) break;
    }
  }

  // FLM UI can render search inside frames; try frame fallback.
  if (!searchInput) {
    const frames = page.frames();
    for (const frame of frames) {
      searchInput = await locateSearchInputInContext(frame);
      if (searchInput) {
        console.log('ℹ️ Using frame search input fallback');
        break;
      }
    }
  }

  // Last fallback: first visible text-like input on page.
  if (!searchInput) {
    const visibleInputs = page.locator('input:visible');
    const visibleCount = await visibleInputs.count().catch(() => 0);
    for (let i = 0; i < visibleCount; i++) {
      const candidate = visibleInputs.nth(i);
      const type = (await candidate.getAttribute('type').catch(() => 'text') || 'text').toLowerCase();
      if (['text', 'search', ''].includes(type)) {
        searchInput = candidate;
        console.log('ℹ️ Using first visible text/search input as Cake search fallback');
        break;
      }
    }
  }

  if (!searchInput) {
    throw new Error('Top Cake search input not found');
  }

  await searchInput.fill(leadId);
  await searchInput.press('Enter');

  const searchResultBanner = page.getByText(`Search Results for Query: ${leadId}`, { exact: false });
  await searchResultBanner.first().waitFor({ state: 'visible', timeout: 12000 }).catch(() => {});
  await visiblePause(page, 'Lead search results visible');
}

async function openLeadPopupAndValidate(page, leadId) {
  let foundLink = false;
  const tabValidation = [];
  let isTest = false;
  const extractedData = {
    pageOrigin: '',
    pixelFired: '',
    affiliate: '',
    taxDebt: '',
    neustar: '',
    neustarDisposition: '',
    dbid: ''
  };

  async function extractFieldValue(page, labelText) {
    try {
      const label = page.locator(`label:has-text("${labelText}")`).first();
      if (await label.count()) {
        const parent = label.locator('xpath=..');
        const field = parent.locator('input, .x-form-display-field, .x-form-field').first();
        if (await field.count()) {
          const val = await field.inputValue().catch(() => null);
          const text = val !== null ? val : await field.textContent();
          return String(text || '').trim();
        }
      }
      const tdLabel = page.locator(`td:has-text("${labelText}")`).last();
      if (await tdLabel.count()) {
        const nextTd = tdLabel.locator('xpath=following-sibling::td').first();
        if (await nextTd.count()) {
          return String(await nextTd.textContent() || '').trim();
        }
      }
    } catch (e) {}
    return '';
  }

  const leadLink = page.locator(`a:has-text("${leadId}")`).first();
  if (await leadLink.count()) {
    await leadLink.click({ timeout: 8000 });
    foundLink = true;
  } else {
    const rowElement = page.locator(`tr:has-text("${leadId}"), td:has-text("${leadId}")`).first();
    if (await rowElement.count()) {
      await rowElement.click({ timeout: 5000 }).catch(() => {});
      foundLink = true;
    }
  }

  const popupHeader = page.locator(`text=${leadId}`).first();
  await popupHeader.waitFor({ state: 'visible', timeout: 10000 }).catch(() => {});
  await visiblePause(page, 'Lead popup opened');

  let testCheckbox = page.locator(
    'input[type="checkbox"][name*="test" i], input[type="checkbox"][id*="test" i]'
  ).first();
  if (!await testCheckbox.count()) {
    testCheckbox = page.getByText(/Is Test/i).locator('xpath=..').locator('input[type="checkbox"]').first();
  }
  if (await testCheckbox.count()) {
    isTest = await testCheckbox.isChecked().catch(() => false);
  }

  async function openSectionWithRetry(sectionName, tabIndex) {
    console.log(`Opening Tab ${tabIndex}`);
    const selectors = [
      `[role="tab"]:has-text("${sectionName}")`,
      `a:has-text("${sectionName}")`,
      `span:has-text("${sectionName}")`,
      `div:has-text("${sectionName}")`
    ];

    let opened = false;
    let selected = null;
    for (let attempt = 1; attempt <= 2; attempt++) {
      for (const selector of selectors) {
        const candidate = page.locator(selector).first();
        if (!await candidate.count()) continue;
        try {
          await candidate.click({ timeout: 5000 });
          await candidate.evaluate((el) => {
            el.style.outline = '3px solid #ff6600';
            el.style.outlineOffset = '1px';
          }).catch(() => {});
          await page.waitForLoadState('domcontentloaded', { timeout: 5000 }).catch(() => {});
          await visiblePause(page, `Tab ${tabIndex} active (${sectionName})`);
          opened = true;
          selected = candidate;
          break;
        } catch (err) {
          console.warn(`Tab ${tabIndex} open attempt ${attempt} failed on selector ${selector}: ${err.message}`);
        }
      }
      if (opened) break;
    }

    if (!opened) {
      await captureScreenshot(page, `cake_tab_open_fail_${leadId}_tab${tabIndex}_${sectionName.replace(/\s+/g, '_')}`);
      console.error(`✗ Failed to open Tab ${tabIndex}: ${sectionName}`);
      return null;
    }
    return selected;
  }

  // Validate all 3 highlighted tabs sequentially.
  const highlightedSections = [
    { tabIndex: 1, name: 'Personal Information' },
    { tabIndex: 2, name: 'Sale Info' },
    { tabIndex: 3, name: 'Vertical Specific' }
  ];

  for (const sectionMeta of highlightedSections) {
    const sectionName = sectionMeta.name;
    const tabIndex = sectionMeta.tabIndex;
    const openedSection = await openSectionWithRetry(sectionName, tabIndex);
    if (!openedSection) {
      tabValidation.push({ tab: sectionName, fieldCount: 0, blankCount: 0, status: 'FAIL' });
      continue;
    }

    if (sectionName === 'Sale Info') {
      extractedData.pixelFired = await extractFieldValue(page, 'Pixel Fired');
      if (!extractedData.pixelFired) extractedData.pixelFired = await extractFieldValue(page, 'pixel_fired');
      extractedData.affiliate = await extractFieldValue(page, 'Affiliate');
      if (!extractedData.affiliate) extractedData.affiliate = await extractFieldValue(page, 'affiliate');
      extractedData.dbid = await extractFieldValue(page, 'DBID');
      if (!extractedData.dbid) extractedData.dbid = await extractFieldValue(page, 'Sub ID');
    }
    
    if (sectionName === 'Vertical Specific') {
      extractedData.pageOrigin = await extractFieldValue(page, 'page origin');
      if (!extractedData.pageOrigin) extractedData.pageOrigin = await extractFieldValue(page, 'Page Origin');
      if (!extractedData.pageOrigin) extractedData.pageOrigin = await extractFieldValue(page, 'page_origin');
      extractedData.taxDebt = await extractFieldValue(page, 'tax_debt');
      if (!extractedData.taxDebt) extractedData.taxDebt = await extractFieldValue(page, 'Tax Debt');
      extractedData.neustar = await extractFieldValue(page, 'neustar');
      if (!extractedData.neustar) extractedData.neustar = await extractFieldValue(page, 'Neustar');
      extractedData.neustarDisposition = await extractFieldValue(page, 'neustar_disposition');
      if (!extractedData.neustarDisposition) extractedData.neustarDisposition = await extractFieldValue(page, 'Neustar Disposition');
      if (!extractedData.dbid) extractedData.dbid = await extractFieldValue(page, 'dbid');
      if (!extractedData.dbid) extractedData.dbid = await extractFieldValue(page, 'DBID');
    }

    // Validate only visible fields in popup while section is active.
    const fields = await page.locator(
      '.x-window, .x-panel, body'
    ).first().locator('input:visible, select:visible, textarea:visible').all();

    let blankCount = 0;
    let checkedFields = 0;
    for (const field of fields) {
      const value = await field.inputValue().catch(() => '');
      const placeholder = await field.getAttribute('placeholder').catch(() => '');
      const required = (await field.getAttribute('required').catch(() => null)) !== null;
      const name = (await field.getAttribute('name').catch(() => '') || '').toLowerCase();
      const id = (await field.getAttribute('id').catch(() => '') || '').toLowerCase();
      const shouldCheck = required
        || name.includes('first')
        || name.includes('last')
        || name.includes('email')
        || name.includes('state')
        || name.includes('zip')
        || name.includes('phone')
        || id.includes('first')
        || id.includes('last')
        || id.includes('email')
        || id.includes('state')
        || id.includes('zip')
        || id.includes('phone');
      if (!shouldCheck) continue;
      checkedFields++;
      const consideredBlank = (!value || !value.trim()) && !placeholder;
      if (consideredBlank) blankCount++;
      await visiblePause(page, `Field check in ${sectionName}`, 350);
    }

    tabValidation.push({
      tab: sectionName,
      fieldCount: checkedFields,
      blankCount,
      status: checkedFields > 0 && blankCount === 0 ? 'PASS' : 'FAIL'
    });
    console.log(`Tab ${tabIndex} validation completed`);
    await visiblePause(page, `Section ${sectionName} validated`, 1800);
  }

  return { found: foundLink, isTest, tabValidation, finalUrl: page.url(), extractedData };
}

async function captureScreenshot(page, name) {
  const outDir = path.join(__dirname, '..', '..', 'logs', 'flm_agent_screenshots');
  if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });
  const timestamp = Date.now();
  const file = path.join(outDir, `${timestamp}_${name}.png`);
  try {
    await page.screenshot({ path: file, fullPage: true });
    return file;
  } catch (err) {
    console.warn('Screenshot capture failed:', err.message);
    return null;
  }
}

async function appendToDashboard(row) {
  try {
    const appended = await appendFinalValidationRow(row);
    if (appended) {
      console.log(`✅ Row appended to dashboard`);
      return true;
    }
    return false;
  } catch (err) {
    console.error('Failed to append to dashboard:', err.message);
    return false;
  }
}

async function verifyInCake(leadId, browser) {
  console.log(`\n📋 [Cake Verification] Searching for Lead ID: ${leadId}`);
  const context = await browser.newContext();
  
  const page = await context.newPage();
  
  try {
    console.log('• Cake login');
    await loginToCake(page);
    console.log('✓ Cake login completed');

    console.log('• Cake top search by latest Lead ID');
    await openCakeAndSearchLead(page, leadId);
    console.log(`✓ Lead search submitted: ${leadId}`);

    console.log('• Open lead popup and tab-wise validation');
    const result = await openLeadPopupAndValidate(page, leadId);
    if (result.isTest) {
      console.log('✓ IS Test checkbox is CHECKED');
    } else {
      console.log('✓ IS Test checkbox is UNCHECKED or not visible');
    }
    for (const tabResult of result.tabValidation) {
      console.log(`✓ Tab ${tabResult.tab}: ${tabResult.status} (fields=${tabResult.fieldCount}, blanks=${tabResult.blankCount})`);
      if (tabResult.status === 'FAIL') {
        await captureScreenshot(page, `cake_tab_fail_${leadId}_${tabResult.tab.replace(/\s+/g, '_')}`);
      }
    }

    await captureScreenshot(page, `cake_lead_${leadId}_verification`);
    return result;
  } catch (err) {
    console.error('Error during Cake verification:', err.message);
    await captureScreenshot(page, `cake_error_${leadId}`);
    return { found: false, isTest: false, tabValidation: [], finalUrl: '', extractedData: {} };
  } finally {
    try { await page.close(); } catch(e) {}
    try { await context.close(); } catch(e) {}
  }
}

async function verifyInCdb(leadId, browser) {
  console.log(`\n🔐 [CDB Verification] Searching for Lead ID: ${leadId}`);
  const context = await browser.newContext();
  const page = await context.newPage();
  
  try {
    await page.goto(CONFIG.CDB_LOGIN_URL, {
      waitUntil: 'domcontentloaded',
      timeout: 30000
    });

    // Login to CDB
    const emailInput = await page.$('input[type="email"], input[name*="email" i]');
    const passInput = await page.$('input[type="password"], input[name*="pass" i]');
    
    if (emailInput && passInput) {
      await emailInput.fill(CONFIG.CDB_EMAIL);
      await passInput.fill(CONFIG.CDB_PASSWORD);
      await passInput.press('Enter');
      await page.waitForLoadState('domcontentloaded', { timeout: 12000 }).catch(() => {});
      console.log('✓ CDB login attempted');
      await visiblePause(page, 'CDB logged in');
    }

    // Navigate to Lead Listing
    try {
      const listingLink = page.locator('a:has-text("Lead Listing"), button:has-text("Lead Listing"), a:has-text("Leads")').first();
      if (await listingLink.count()) {
        await listingLink.click({ timeout: 5000 }).catch(() => {});
        await page.waitForLoadState('domcontentloaded', { timeout: 10000 }).catch(() => {});
        await visiblePause(page, 'CDB Lead Listing opened');
      }
    } catch (e) {
      console.warn('Could not navigate to Lead Listing');
    }

    // Find and use search input for Lead ID
    const searchInputs = await page.$$('input[type="text"]:visible, input[type="search"]:visible, input[placeholder*="Search"]:visible');
    let found = false;
    if (searchInputs.length > 0) {
      const selectedInput = searchInputs.length >= 2 ? searchInputs[1] : searchInputs[searchInputs.length - 1];
      await selectedInput.fill(leadId);
      await selectedInput.press('Enter');
      await page.waitForLoadState('domcontentloaded', { timeout: 10000 }).catch(() => {});
      console.log(`✓ Searched in CDB for Lead ID using ${searchInputs.length >= 2 ? '2nd' : 'available'} search box`);
      await visiblePause(page, 'CDB search results visible');
    }

    // Verify if Lead ID is found on page
    const pageText = await page.textContent('body');
    found = pageText.includes(leadId);

    if (found) {
      console.log(`✓ Lead ID FOUND in CDB`);
    } else {
      console.warn(`✗ Lead ID NOT FOUND in CDB`);
    }

    await captureScreenshot(page, `cdb_lead_${leadId}_${found ? 'found' : 'notfound'}`);
    return found ? 'PASS' : 'FAIL';
  } catch (err) {
    console.error('CDB verification error:', err.message);
    await captureScreenshot(page, `cdb_lead_${leadId}_error`);
    return 'FAIL';
  } finally {
    try { await page.close(); } catch(e) {}
    try { await context.close(); } catch(e) {}
  }
}

async function main() {
  console.log('\n═══════════════════════════════════════════════════');
  console.log('🚀 FLM Agent – Validate Latest Lead (Isolated)');
  console.log('═══════════════════════════════════════════════════\n');

  // Step 1: Extract latest Lead ID from scheduler logs
  console.log('📂 [Step 1] Extracting latest Lead ID from scheduler logs...');
  const latestLog = await findLatestSchedulerLog();
  if (!latestLog) {
    console.error('❌ No scheduler logs found under logs/scheduler');
    process.exit(1);
  }

  const leadSource = findLatestLeadIdForSchedulerCycle(new Date());
  if (!leadSource) {
    console.error('❌ No leadid found in latest scheduler cycle logs (Mon/Wed/Fri)');
    console.error('ℹ️ Tip: Run scheduler first, then re-run validation.');
    process.exit(1);
  }

  console.log(`✓ Latest scheduler file: ${path.basename(latestLog)}`);
  console.log(`✓ Target scheduler cycle day: ${leadSource.cycleDate.toDateString()} (Mon/Wed/Fri logic)`);
  console.log(`✓ Using lead source log: ${leadSource.logName}`);
  const latestScheduleDate = new Date(leadSource.mtime);
  const alternateDate = computeAlternateDay(latestScheduleDate);
  console.log(`✓ Latest scheduler date: ${latestScheduleDate.toISOString()}`);
  console.log(`✓ Alternate-day date selected: ${alternateDate.toISOString()}`);
  const latestLead = leadSource.leadId;
  console.log(`✓ Latest Lead ID extracted: ${latestLead}\n`);

  // Step 2: Launch browser
  console.log('🌐 [Step 2] Launching browser in headed mode...');
  let browser;
  try {
    browser = await chromium.launch({ headless: false, slowMo: CONFIG.SLOW_MO_MS });
    console.log(`✓ Slow mode enabled: ${CONFIG.SLOW_MO_MS}ms per action`);
    console.log('✓ Browser launched\n');
  } catch (err) {
    console.error('❌ Failed to launch browser:', err.message);
    process.exit(1);
  }

  try {
    // Step 3: Verify in Cake
    console.log('═ Cake Verification Started ═');
    const cakeResult = await verifyInCake(latestLead, browser);
    console.log(`📊 Cake Result: Found=${cakeResult.found}, IsTest=${cakeResult.isTest}, Tabs=${cakeResult.tabValidation.length}`);

    // Step 4: Verify in CDB
    console.log('\n═ CDB Verification Started ═');
    const cdbStatus = await verifyInCdb(latestLead, browser);
    console.log(`📊 CDB Status: ${cdbStatus}`);

    const allTabsPass = cakeResult.tabValidation.length === 3 && cakeResult.tabValidation.every(t => t.status === 'PASS');
    const validationStatus = cakeResult.found && allTabsPass ? 'PASS' : 'FAIL';

    // Step 5: Append to Google Sheet Dashboard
    console.log('\n📈 [Step 5] Appending results to Google Sheet dashboard...');
    
    // Determine note
    let validationNote = '';
    if (cakeResult.extractedData.affiliate && cakeResult.extractedData.affiliate.toLowerCase() !== 'qa affiliate') {
      validationNote = `Actual Affiliate: ${cakeResult.extractedData.affiliate}`;
    }

    const row = {
      dateTime: new Date().toISOString(),
      pageUrl: cakeResult.extractedData.pageOrigin || '',
      leadId: latestLead,
      inCake: cakeResult.found ? 'Yes' : 'No',
      inCdb: cdbStatus === 'PASS' ? 'Yes' : 'No',
      isTest: cakeResult.isTest ? 'Yes' : 'No',
      pixelFired: cakeResult.extractedData.pixelFired || '',
      affiliate: cakeResult.extractedData.affiliate || '',
      taxDebt: cakeResult.extractedData.taxDebt || '',
      neustar: cakeResult.extractedData.neustar || '',
      neustarDisposition: cakeResult.extractedData.neustarDisposition || '',
      dbid: cakeResult.extractedData.dbid || '',
      date: new Date().toISOString(),
      note: validationNote
    };

    // We no longer require absolute PASS on all tabs, just append the extracted data
    // Because the new schema acts as a data-logging mechanism regardless of success/fail
    const appended = await appendToDashboard(row);
    if (!appended) {
      console.warn('⚠️ Warning: Google sheet row could not be appended');
    }

    const localSheetPath = appendToLocalDashboardCsv({
      url: CONFIG.CAKE_HOME_URL,
      leadId: latestLead,
      validationStatus,
      cdbStatus: cdbStatus === 'PASS' ? 'True' : 'False',
      executionDate: new Date().toISOString()
    });
    console.log(`📁 Local month-wise dashboard updated: ${localSheetPath}`);

    // Step 6: Final Report
    console.log('\n═══════════════════════════════════════════════════');
    console.log('📋 Validation Summary:');
    console.log(`  Lead ID: ${latestLead}`);
    console.log(`  Cake Found: ${cakeResult.found ? '✅ YES' : '❌ NO'}`);
    console.log(`  Cake IS Test: ${cakeResult.isTest ? '✅ YES' : '❌ NO'}`);
    console.log(`  CDB Status: ${cdbStatus}`);
    console.log(`  Validation Status: ${validationStatus}`);
    console.log('═══════════════════════════════════════════════════\n');

    if (cdbStatus !== 'PASS') {
      console.warn(`⚠️ Alert: Lead ${latestLead} NOT FOUND in CDB system`);
    } else {
      console.log(`✅ Lead ${latestLead} successfully validated in both systems`);
    }
  } finally {
    await browser.close();
    console.log('\n✓ Browser closed. Process complete.');
  }
}

if (require.main === module) {
  main().catch(err => {
    console.error('❌ Fatal error:', err);
    process.exit(1);
  });
}

module.exports = {
  findLatestSchedulerLog,
  extractLastLeadIdFromLog,
  verifyInCake,
  verifyInCdb,
  appendToDashboard
};
