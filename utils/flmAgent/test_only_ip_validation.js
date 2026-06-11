// utils/flmAgent/test_only_ip_validation.js
// --------------------------------------------------------------------------------
// Process Name: FLM_TestOnly_IP_Validation
// Purpose: Test Only IP Verification & Validation Tracking (Google Sheets & CSV)
// --------------------------------------------------------------------------------

const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');
const { google } = require('googleapis');
require('dotenv').config({ path: path.resolve(__dirname, '../../.env') });

// Setup Directories
const REPORT_DIR = path.resolve(__dirname, 'test_only_reports');
const SCREENSHOT_DIR = path.resolve(__dirname, 'test_only_screenshots');
[REPORT_DIR, SCREENSHOT_DIR].forEach(dir => {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
});

// Logs utility
const logFile = path.join(REPORT_DIR, `execution_${Date.now()}.log`);
function log(msg, level = 'INFO') {
  const time = new Date().toISOString();
  const line = `[${time}] [${level}] ${msg}`;
  fs.appendFileSync(logFile, line + '\n');
  console.log(`[${level}] ${msg}`);
}

// Dedicated Configuration for Test Only Validation Process
const FLM_TestOnly_IP_Validation = {
  CSV_DASHBOARD_PATH: path.resolve(__dirname, '../../FML_Project_Dashboard/Test_Only_IP_Validation_Dashboard.csv'),
  GOOGLE_SHEET_ID: '1fO1YFFIM-i_DRPLqdSqC4oECeAHEETPJmN6RWlTrLzU',
  SHEET_TAB_NAME: 'Test Only IP Data',
  EXPECTED_HEADERS: ['Date', 'Lead ID', 'IP & IP Count', 'IS Test', 'Name & Email Validation', 'Pixel Fired'],
  EXPECTED_USER_INFO: {
    firstName: 'CKMTESTPIXEL',
    lastName: 'CKMTESTPIXEL',
    email: 'ckmtestpixel@gmail.com'
  }
};

// Helper to format dates as MM/DD/YYYY
function formatDateMDY(date) {
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  const y = date.getFullYear();
  return `${m}/${d}/${y}`;
}

// Dynamic Start Date based on scheduling pattern (Monday, Wednesday, Friday)
function getLatestSchedulerStartDate(currentDate = new Date()) {
  const day = currentDate.getDay(); // 0 = Sunday, 1 = Monday, 2 = Tuesday, 3 = Wednesday, 4 = Thursday, 5 = Friday, 6 = Saturday
  const diffMap = {
    0: 2, // Sunday -> Friday (2 days ago)
    1: 3, // Monday -> Friday (3 days ago)
    2: 1, // Tuesday -> Monday (1 day ago)
    3: 2, // Wednesday -> Monday (2 days ago)
    4: 1, // Thursday -> Wednesday (1 day ago)
    5: 2, // Friday -> Wednesday (2 days ago)
    6: 1  // Saturday -> Friday (1 day ago)
  };
  const diffDays = diffMap[day] || 1;
  const startDate = new Date(currentDate);
  startDate.setDate(currentDate.getDate() - diffDays);
  return startDate;
}

/**
 * Wait for grid data rows to be populated with real IP addresses
 */
async function waitForGridLoad(page, timeout = 25000) {
  log('Waiting for grid data to load...');
  const start = Date.now();
  while (Date.now() - start < timeout) {
    const hasData = await page.evaluate(() => {
      const cells = Array.from(document.querySelectorAll('td, div, span, .ag-cell, .x-grid3-cell'));
      return cells.some(c => {
        const text = (c.innerText || c.textContent || '').trim();
        return /\b(?:\d{1,3}\.){3}\d{1,3}\b/.test(text) && !text.includes('IP Address');
      });
    });
    if (hasData) {
      log('✓ Grid data loaded successfully.');
      return true;
    }
    await page.waitForTimeout(1000);
  }
  log('Grid load wait finished (either no data or slow loading).', 'WARN');
  return false;
}

/**
 * Append row results to Google Sheets
 */
async function appendToGoogleSheet(rowsToAppend) {
  const spreadsheetId = FLM_TestOnly_IP_Validation.GOOGLE_SHEET_ID;
  const sheetName = FLM_TestOnly_IP_Validation.SHEET_TAB_NAME;
  log(`Connecting to Google Sheet ID: ${spreadsheetId}, Tab: ${sheetName}...`);

  try {
    const keyFilename = process.env.GOOGLE_SERVICE_ACCOUNT_FILE || 'service_account.json';
    const auth = new google.auth.GoogleAuth({
      keyFile: path.isAbsolute(keyFilename) ? keyFilename : path.resolve(__dirname, '../../', keyFilename),
      scopes: ['https://www.googleapis.com/auth/spreadsheets']
    });
    
    const client = await auth.getClient();
    const sheets = google.sheets({ version: 'v4', auth: client });

    // Verify if sheet contains headers in A1:E1
    let hasHeaders = false;
    try {
      const getRes = await sheets.spreadsheets.values.get({ spreadsheetId, range: `${sheetName}!A1:E1` });
      if (getRes.data.values && getRes.data.values[0] && getRes.data.values[0].length > 0) {
        hasHeaders = true;
      }
    } catch (e) {
      log(`Tab "${sheetName}" range check failed or tab does not exist: ${e.message}`);
    }

    if (!hasHeaders) {
      // Verify if the tab/sheet exists at all in the spreadsheet
      let tabExists = false;
      try {
        const metadata = await sheets.spreadsheets.get({ spreadsheetId });
        const sheetsList = metadata.data.sheets || [];
        tabExists = sheetsList.some(s => s.properties && s.properties.title === sheetName);
      } catch (err) {
        log(`Failed to fetch spreadsheet metadata: ${err.message}`, 'WARN');
      }

      if (!tabExists) {
        log(`Tab "${sheetName}" not found. Creating it...`);
        await sheets.spreadsheets.batchUpdate({
          spreadsheetId,
          requestBody: {
            requests: [{
              addSheet: {
                properties: {
                  title: sheetName,
                  gridProperties: { rowCount: 2000, columnCount: 5, frozenRowCount: 1 }
                }
              }
            }]
          }
        });
      }

      // Write headers to Row 1
      log(`Writing headers to "${sheetName}"!A1:E1...`);
      await sheets.spreadsheets.values.update({
        spreadsheetId,
        range: `${sheetName}!A1:E1`,
        valueInputOption: 'USER_ENTERED',
        requestBody: { values: [FLM_TestOnly_IP_Validation.EXPECTED_HEADERS] }
      });
    }

    // Append rows
    await sheets.spreadsheets.values.append({
      spreadsheetId,
      range: `${sheetName}!A2`,
      valueInputOption: 'USER_ENTERED',
      insertDataOption: 'INSERT_ROWS',
      requestBody: { values: rowsToAppend }
    });
    log('✓ Google Sheet updated successfully.');
  } catch (error) {
    log(`⚠️ Failed to update Google Sheet: ${error.message}`, 'WARN');
  }
}

/**
 * Append row results to local CSV Dashboard (month-wise)
 */
function appendToCSV(rowsToAppend) {
  const months = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
  const now = new Date();
  const monthName = months[now.getMonth()];
  const year = now.getFullYear();
  const csvPath = path.resolve(__dirname, `../../FML_Project_Dashboard/Test_Only_IP_Validation_Dashboard_${monthName}_${year}.csv`);
  
  log(`Appending ${rowsToAppend.length} row(s) to local CSV Dashboard at ${csvPath}...`);

  // Ensure CSV exists and write headers if new
  const dir = path.dirname(csvPath);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  if (!fs.existsSync(csvPath)) {
    fs.writeFileSync(csvPath, FLM_TestOnly_IP_Validation.EXPECTED_HEADERS.join(',') + '\n', 'utf8');
  }

  for (const row of rowsToAppend) {
    const escapedRow = row.map(val => {
      const stringVal = String(val);
      if (stringVal.includes(',') || stringVal.includes('"') || stringVal.includes('\n')) {
        return `"${stringVal.replace(/"/g, '""')}"`;
      }
      return stringVal;
    });
    fs.appendFileSync(csvPath, escapedRow.join(',') + '\n', 'utf8');
    log(`Appended to CSV: ${escapedRow.join(',')}`);
  }
}

/**
 * Main execution logic
 */
(async () => {
  log('='.repeat(70));
  log('🚀 PROCESS START: FLM_TestOnly_IP_Validation (Dynamic Date & 200 Rows Mode)');
  log('='.repeat(70));

  const username = process.env.CAKE_USERNAME;
  const password = process.env.CAKE_PASSWORD;

  if (!username || !password) {
    log('Missing CAKE_USERNAME or CAKE_PASSWORD in env variables.', 'ERROR');
    process.exit(1);
  }

  // Calculate scheduler start and current end date dynamically
  const today = new Date();
  const startDate = formatDateMDY(getLatestSchedulerStartDate(today));
  const endDate = formatDateMDY(today);
  log(`Processed Dynamic Date Range: Start = ${startDate}, End = ${endDate}`);

  const authStatePath = path.resolve(__dirname, '../../CakeProcess.js/cake-auth-state.json');

  // Launch Playwright Browser in HEADED mode
  log('Launching Playwright Browser in HEADED mode (Chrome channel)...');
  let browser;
  try {
    browser = await chromium.launch({ headless: false, channel: 'chrome' });
  } catch (err) {
    log('Failed to launch with chrome channel, falling back to default Chromium headed...', 'WARN');
    browser = await chromium.launch({ headless: false });
  }

  const context = await browser.newContext({
    storageState: fs.existsSync(authStatePath) ? authStatePath : undefined
  });
  const page = await context.newPage();

  try {
    // Maximize viewport to display full report grid
    await page.setViewportSize({ width: 1920, height: 1080 });

    // 1. Navigate to Cake CRM and login
    log('Navigating to Cake CRM...');
    try {
      await page.goto('https://app.forwardleapmarketing.com/', { waitUntil: 'domcontentloaded', timeout: 60000 });
    } catch (navErr) {
      log(`First navigation attempt failed (${navErr.message}), retrying...`, 'WARN');
      await page.waitForTimeout(3000);
      await page.goto('https://app.forwardleapmarketing.com/', { waitUntil: 'domcontentloaded', timeout: 60000 });
    }
    await page.waitForTimeout(2000);

    const loginBtn = await page.$('#submitButton, button:has-text("Log In"), input[type="submit"]');
    if (loginBtn) {
      log('Login page detected. Attempting login...');
      const uField = await page.$('#u, input[name="u"], input[type="text"]');
      const pField = await page.$('#password, input[name="p"], input[type="password"]');

      if (uField && pField) {
        await uField.fill(username);
        await pField.fill(password);
        await loginBtn.click();
        log('Clicked Login. Waiting for dashboard page redirect...');
        
        await page.waitForFunction(() => {
          const url = window.location.href;
          return url.includes('newaff.aspx') || url.includes('newrep.aspx') || url.includes('newrep');
        }, { timeout: 30000 });
        
        await page.waitForLoadState('networkidle').catch(() => {});
        await page.waitForTimeout(3000);
      } else {
        throw new Error('Username/password input fields not found.');
      }
      
      log('✓ Login Successful.');
      try {
        await context.storageState({ path: authStatePath });
        log(`✓ Session state saved to: ${authStatePath}`);
      } catch (saveErr) {
        log(`⚠️ Could not save session state: ${saveErr.message}`, 'WARN');
      }
    } else {
      log('✓ Already logged in via session state.');
    }

    // 2. Navigate to Reports -> Conversions
    log('Navigating to Reports > Conversions...');
    const reportsLink = page.locator('a[href="newrep.aspx"], a:has-text("REPORTS")').first();
    await reportsLink.waitFor({ state: 'visible', timeout: 20000 });
    await reportsLink.click();
    await page.waitForTimeout(3000); // Allow menu to fully render

    const conversionsItem = page.locator('.secondary-menu-item-text, .secondary-menu-item-container').filter({ hasText: /^Conversions$/i }).first();
    await conversionsItem.waitFor({ state: 'visible', timeout: 20000 });
    await page.waitForTimeout(1000);
    await conversionsItem.click();

    // Wait for the Conversions Report page framework components to load
    log('Waiting for Conversion Report page to load...');
    await page.waitForFunction(() => {
      const bodyText = document.body ? document.body.innerText : '';
      return bodyText.includes('Conversion Report') && bodyText.includes('Unique ID');
    }, { timeout: 30000 });
    log('✓ Navigated to Conversions Report Page.');

    // 3. Apply "Tests Only" filter in the Tests dropdown select
    log('Applying Tests Only filter dropdown option...');
    try {
      const extJsSuccess = await page.evaluate(() => {
        try {
          if (typeof window.Ext !== 'undefined' && window.Ext.ComponentMgr && window.Ext.ComponentMgr.all) {
            const allItems = window.Ext.ComponentMgr.all.items || [];
            const combos = allItems.filter(c => c && c.getXType && c.getXType() === 'combo');
            let updatedCount = 0;
            for (const combo of combos) {
              const store = combo.getStore && combo.getStore();
              if (store && typeof store.find === 'function') {
                const idx = store.find(combo.displayField || 'text', /Tests?\s*Only/i);
                if (idx !== -1) {
                  const record = store.getAt(idx);
                  combo.setValue(record.get(combo.valueField || 'value'));
                  if (typeof combo.fireEvent === 'function') {
                    combo.fireEvent('select', combo, record, idx);
                    combo.fireEvent('change', combo, combo.getValue());
                  }
                  updatedCount++;
                }
              }
            }
            return updatedCount > 0;
          }
        } catch (e) {
          console.error('ExtJS Error setting combo:', e);
        }
        return false;
      });

      if (extJsSuccess) {
        log('✓ Tests dropdown updated via ExtJS API.');
      } else {
        // Fallback 1: Click the combo trigger
        const trigger = page.locator('input[value*="Tests & Non-Tests"], input[value*="Tests & Non-Tests"] + img, .x-form-trigger').first();
        if (await trigger.count() > 0) {
          await trigger.click();
          await page.waitForTimeout(500);
          const optionItem = page.locator('.x-combo-list-item:has-text("Tests Only")').first();
          if (await optionItem.count() > 0) {
            await optionItem.click();
            log('✓ Tests dropdown updated via UI clicking.');
          }
        } else {
          // Fallback 2: Select element manipulation
          await page.evaluate(() => {
            const select = Array.from(document.querySelectorAll('select')).find(s => {
              return Array.from(s.options).some(o => /Tests?\s*&\s*Non-Tests?/i.test(o.text));
            });
            if (select) {
              const opt = Array.from(select.options).find(o => /Tests?\s*Only/i.test(o.text));
              if (opt) {
                select.value = opt.value;
              } else {
                select.value = '3'; // value fallback
              }
              select.dispatchEvent(new Event('change'));
            }
          });
          log('✓ Tests dropdown updated via standard select fallback.');
        }
      }
      await page.waitForTimeout(3000);
    } catch (toggleErr) {
      log(`⚠️ Could not find or select "Tests Only" in dropdown: ${toggleErr.message}`, 'WARN');
    }

    // 4. Set Rows Per Page to 200
    log('Setting Rows Per Page to 200...');
    try {
      await page.evaluate(() => {
        const select = document.querySelector('#pagination-dropdown-pagesize') || Array.from(document.querySelectorAll('select')).find(s => {
          return Array.from(s.options).some(o => o.value === '200');
        });
        if (select) {
          select.value = '200';
          select.dispatchEvent(new Event('change'));
        }
      });
      log('✓ Set Rows Per Page = 200.');
      await page.waitForTimeout(5000); // Wait for grid re-render
    } catch (pageSizeErr) {
      log(`⚠️ Could not set Rows Per Page: ${pageSizeErr.message}`, 'WARN');
    }

    // 5. Apply Date Range Inputs
    log('Applying date range inputs...');
    let startLocator, endLocator;

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
          return { id: el.id || '', name: el.name || '', value: el.value || '', x: r.x };
        })
        .sort((a, b) => a.x - b.x);
    });

    if (dateInputs.length >= 2) {
      const startInput = dateInputs[0];
      const endInput = dateInputs[1];
      startLocator = startInput.id ? page.locator(`#${startInput.id}`).first() : page.locator(`input[name="${startInput.name}"]`).first();
      endLocator = endInput.id ? page.locator(`#${endInput.id}`).first() : page.locator(`input[name="${endInput.name}"]`).first();
    } else {
      log('Could not find date inputs by value, trying name/label fallbacks...');
      const startInputs = page.locator('input[id*="start" i], input[name*="start" i], input[placeholder*="start" i]');
      const endInputs = page.locator('input[id*="end" i], input[name*="end" i], input[placeholder*="end" i]');
      if (await startInputs.first().isVisible().catch(() => false) && await endInputs.first().isVisible().catch(() => false)) {
        startLocator = startInputs.first();
        endLocator = endInputs.first();
      }
    }

    if (!startLocator || !endLocator) {
      throw new Error('Could not locate the Start and End date inputs on the conversion report page.');
    }

    await startLocator.click().catch(() => {});
    await startLocator.fill(startDate).catch(() => {});
    await startLocator.press('Enter').catch(() => {});
    await page.waitForTimeout(500);

    await endLocator.click().catch(() => {});
    await endLocator.fill(endDate).catch(() => {});
    await endLocator.press('Enter').catch(() => {});
    await page.waitForTimeout(1000);
    
    // Click the Filter button to execute the report
    log('Clicking the "Filter" button...');
    try {
      await page.evaluate(() => {
        const filterTd = Array.from(document.querySelectorAll('td.x-btn-mc')).find(td => td.innerText.includes('Filter'));
        if (filterTd) {
          const btn = filterTd.querySelector('button') || filterTd;
          btn.click();
        }
      });
      log('✓ Filter button clicked.');
    } catch (filterErr) {
      log(`⚠️ Could not click Filter button: ${filterErr.message}`, 'WARN');
    }
    
    await page.waitForTimeout(5000); // Wait for re-render
    log(`✓ Date range set successfully: ${startDate} to ${endDate}`);

    // Wait for the visible grid to settle
    const gridSelector = 'table:visible, [role="grid"]:visible, [role="table"]:visible';
    const gridLocator = page.locator(gridSelector).first();
    await gridLocator.waitFor({ state: 'visible', timeout: 30000 });
    log('✓ Report grid is visible.');

    // Wait for grid data to load
    await waitForGridLoad(page);

    // 6. Traverse All Pages and Count IP Occurrences
    log('Aggregating unique IP addresses page-by-page...');
    const ipCounts = new Map(); // ip -> count
    let pageNum = 1;
    let hasNextPage = true;

    while (hasNextPage) {
      log(`Processing page ${pageNum}...`);
      await page.waitForTimeout(2000);

      // Extract only IP addresses from each row (no lead ID collection needed)
      const pageIPs = await page.evaluate(() => {
        const rows = Array.from(document.querySelectorAll('.ag-row, .x-grid3-row, .x-grid-row, [role="row"]'));
        const ips = [];
        for (const row of rows) {
          const cells = Array.from(row.querySelectorAll('.ag-cell, .x-grid3-cell, [role="gridcell"], [role="cell"], td'));
          if (cells.length === 0) continue;
          const firstCellText = (cells[0].textContent || '').trim();
          if (firstCellText === 'Unique ID' || firstCellText === 'Lead ID' || firstCellText === '') continue;

          // Search all cells for an IP address pattern
          for (let c = 1; c < cells.length; c++) {
            const cellText = (cells[c].textContent || '').trim();
            if (/\b(?:\d{1,3}\.){3}\d{1,3}\b/.test(cellText)) {
              ips.push(cellText);
              break;
            }
          }
        }
        return ips;
      });

      log(`Found ${pageIPs.length} IP entries on page ${pageNum}.`);

      for (const ip of pageIPs) {
        ipCounts.set(ip, (ipCounts.get(ip) || 0) + 1);
      }

      // Check next page button
      const nextBtn = page.locator('button.ag-paging-button[ref="btNext"], .x-tbar-page-next, button:has-text("Next")').filter({ visible: true }).first();
      const nextVisible = await nextBtn.isVisible().catch(() => false);
      const nextDisabled = nextVisible ? await nextBtn.evaluate((el) => {
        return el.disabled || 
               el.classList.contains('x-item-disabled') || 
               el.closest('.x-item-disabled') !== null || 
               el.closest('.x-btn-disabled') !== null;
      }).catch(() => true) : true;

      if (nextVisible && !nextDisabled) {
        log('Navigating to next page...');
        await nextBtn.click();
        await page.waitForTimeout(2000);
        await waitForGridLoad(page);
        pageNum++;
      } else {
        log('Reached last page of report.');
        hasNextPage = false;
      }
    }

    log(`Total unique IP addresses found: ${ipCounts.size}`);
    for (const [ip, count] of ipCounts.entries()) {
      log(` - IP: ${ip} : ${count} occurrence(s)`);
    }

    // 7. For each unique IP — find one lead in the grid, then validate it
    log(`Starting lead validation for ${ipCounts.size} unique IP(s)...`);
    const rowsToAppend = [];

    for (const [ip, count] of ipCounts.entries()) {
      log(`🔎 Looking for a lead row with IP: ${ip} (${count} occurrence(s))...`);

      // Navigate back to page 1 before searching
      const firstBtn = page.locator('button.ag-paging-button[ref="btFirst"], .x-tbar-page-first, button:has-text("First")').filter({ visible: true }).first();
      const firstVisible = await firstBtn.isVisible().catch(() => false);
      const firstDisabled = firstVisible ? await firstBtn.evaluate((el) => {
        return el.disabled ||
               el.classList.contains('x-item-disabled') ||
               el.closest('.x-item-disabled') !== null ||
               el.closest('.x-btn-disabled') !== null;
      }).catch(() => true) : true;

      if (firstVisible && !firstDisabled) {
        log('Navigating back to page 1 to search for IP row...');
        await firstBtn.click();
        await page.waitForTimeout(2000);
        await waitForGridLoad(page);
      }

      // Search through pages to find first row that has this IP
      let foundLeadId = null;
      let linkClicked = false;
      let scanPage = 1;
      let hasScanNext = true;

      while (hasScanNext && !linkClicked) {
        const result = await page.evaluate((targetIP) => {
          const rows = Array.from(document.querySelectorAll('.ag-row, .x-grid3-row, .x-grid-row, [role="row"], table tr'));
          for (const row of rows) {
            const cells = Array.from(row.querySelectorAll('.ag-cell, .x-grid3-cell, [role="gridcell"], [role="cell"], td'));
            if (cells.length === 0) continue;
            const rowText = row.textContent || '';
            if (!rowText.includes(targetIP)) continue;

            // Confirm the IP is an exact cell match
            const hasIP = Array.from(cells).some(c => {
              const t = (c.textContent || '').trim();
              return t === targetIP || new RegExp('\\b' + targetIP.replace(/\./g, '\\.') + '\\b').test(t);
            });
            if (!hasIP) continue;

            // Get lead ID from first cell
            const leadId = (cells[0].textContent || '').trim();
            if (!leadId || leadId === 'Unique ID' || leadId === 'Lead ID') continue;

            // Click the first link in the row
            const link = row.querySelector('a, button, [role="button"]');
            if (link) {
              link.scrollIntoView();
              link.click();
              return { clicked: true, leadId };
            }
          }
          return { clicked: false, leadId: null };
        }, ip);

        if (result.clicked && result.leadId) {
          foundLeadId = result.leadId;
          log(`✓ Found and clicked lead ${foundLeadId} for IP: ${ip} on scan page ${scanPage}`);
          await page.waitForTimeout(5000);
          linkClicked = true;
          break;
        }

        // Try next page
        const nextBtn = page.locator('button.ag-paging-button[ref="btNext"], .x-tbar-page-next, button:has-text("Next")').filter({ visible: true }).first();
        const nextVisible = await nextBtn.isVisible().catch(() => false);
        const nextDisabled = nextVisible ? await nextBtn.evaluate((el) => {
          return el.disabled ||
                 el.classList.contains('x-item-disabled') ||
                 el.closest('.x-item-disabled') !== null ||
                 el.closest('.x-btn-disabled') !== null;
        }).catch(() => true) : true;

        if (nextVisible && !nextDisabled) {
          await nextBtn.click();
          await page.waitForTimeout(2000);
          await waitForGridLoad(page);
          scanPage++;
        } else {
          hasScanNext = false;
        }
      }

      if (!linkClicked || !foundLeadId) {
        log(`Could not find a clickable lead row for IP: ${ip}`, 'WARN');
        continue;
      }

      // 8. Lead Verification — click each tab and read fields within it
      const extracted = {
        firstName: '',
        lastName: '',
        email: '',
        isTest: false,
        disposition: ''
      };

      // Helper: click a named tab via JS evaluate() — bypasses ExtJS overlay pointer interception
      async function clickLeadTab(tabName, tabIndex) {
        log(`  → Clicking Tab ${tabIndex}: "${tabName}"...`);

        // Strategy 1: Use ExtJS TabPanel API directly (most reliable for ExtJS apps)
        const extjsSuccess = await page.evaluate((name) => {
          try {
            if (typeof Ext === 'undefined') return false;
            const all = Ext.ComponentMgr.all.items || [];
            const tabPanels = all.filter(c => c && c.getXType && c.getXType() === 'tabpanel');
            for (const panel of tabPanels) {
              const items = panel.items && panel.items.items ? panel.items.items : [];
              for (let i = 0; i < items.length; i++) {
                const tab = items[i];
                const title = (tab.title || tab.tabTip || '').trim();
                if (title.toLowerCase().includes(name.toLowerCase())) {
                  panel.setActiveTab(i);
                  return true;
                }
              }
            }
          } catch (e) {}
          return false;
        }, tabName).catch(() => false);

        if (extjsSuccess) {
          log(`  ✓ Tab ${tabIndex} "${tabName}" opened via ExtJS API.`);
          await page.waitForTimeout(1500);
          // Highlight tab visually
          await page.evaluate((name) => {
            const items = Array.from(document.querySelectorAll('.x-tab-strip-text, .x-tab-strip li span, .x-tab-strip li a'));
            const el = items.find(e => e.textContent.trim().toLowerCase().includes(name.toLowerCase()));
            if (el) { el.style.outline = '3px solid #ff6600'; el.style.outlineOffset = '1px'; }
          }, tabName).catch(() => {});
          return true;
        }

        // Strategy 2: Direct DOM .click() via evaluate() — bypasses pointer-event blocking
        const domSuccess = await page.evaluate((name) => {
          try {
            // Try tab strip items first (ExtJS tab bar)
            const candidates = [
              ...Array.from(document.querySelectorAll('.x-tab-strip-text')),
              ...Array.from(document.querySelectorAll('.x-tab-strip li')),
              ...Array.from(document.querySelectorAll('.x-tab-strip a')),
              ...Array.from(document.querySelectorAll('[role="tab"]'))
            ];
            for (const el of candidates) {
              if ((el.textContent || '').trim().toLowerCase().includes(name.toLowerCase())) {
                el.style.outline = '3px solid #ff6600';
                el.style.outlineOffset = '1px';
                el.click(); // Direct DOM click — no pointer-event check
                return true;
              }
            }
          } catch (e) {}
          return false;
        }, tabName).catch(() => false);

        if (domSuccess) {
          log(`  ✓ Tab ${tabIndex} "${tabName}" opened via DOM click.`);
          await page.waitForTimeout(1500);
          return true;
        }

        log(`  ✗ Tab ${tabIndex} "${tabName}" not found by any method.`, 'WARN');
        return false;
      }

      // Helper: read a field by its label — handles both standard inputs AND ExtJS display fields (div.x-form-display-field)
      async function extractFieldValue(labelText) {
        try {
          const labelRegex = new RegExp(`^\\s*${labelText}\\s*:?\\s*$`, 'i');
          // Try <label> element approach
          const label = page.locator('label').filter({ hasText: labelRegex }).first();
          if (await label.count().catch(() => 0)) {
            const parent = label.locator('xpath=..');
            const field = parent.locator('input, .x-form-display-field, .x-form-field').first();
            if (await field.count().catch(() => 0)) {
              const val = await field.inputValue().catch(() => null);
              const text = val !== null ? val : await field.textContent().catch(() => '');
              return String(text || '').trim();
            }
          }
          // Try <td> label approach (table-based ExtJS layouts)
          const tdLabel = page.locator('td').filter({ hasText: labelRegex }).last();
          if (await tdLabel.count().catch(() => 0)) {
            const nextTd = tdLabel.locator('xpath=following-sibling::td').first();
            if (await nextTd.count().catch(() => 0)) {
              return String(await nextTd.textContent().catch(() => '') || '').trim();
            }
          }
        } catch (e) {}
        return '(not found)';
      }

      try {
        // ── TAB 1: Personal Information ───────────────────────────────────
        const tab1Opened = await clickLeadTab('Personal Information', 1);
        if (tab1Opened) {
          const firstField = page.locator('input[name*="first" i], input[id*="first" i]').first();
          if (await firstField.isVisible().catch(() => false))
            extracted.firstName = (await firstField.inputValue()).trim();

          const lastField = page.locator('input[name*="last" i], input[id*="last" i]').first();
          if (await lastField.isVisible().catch(() => false))
            extracted.lastName = (await lastField.inputValue()).trim();

          const emailField = page.locator('input[type="email" i], input[name*="email" i], input[id*="email" i]').first();
          if (await emailField.isVisible().catch(() => false))
            extracted.email = (await emailField.inputValue()).trim();

          // IS Test checkbox is usually on the Personal Information tab
          const testCheckbox = page.locator(
            'input[type="checkbox"][id*="test" i], input[type="checkbox"][name*="test" i]'
          ).first();
          if (await testCheckbox.isVisible().catch(() => false))
            extracted.isTest = await testCheckbox.isChecked().catch(() => false);

          log(`  Personal Info → First="${extracted.firstName}", Last="${extracted.lastName}", Email="${extracted.email}", IsTest=${extracted.isTest}`);
          await page.waitForTimeout(1500);
        }

        // ── TAB 2: Sale Info ──────────────────────────────────────────────
        const tab2Opened = await clickLeadTab('Sale Info', 2);
        if (tab2Opened) {
          // Use label-based extractor — works for ExtJS display fields (not just standard inputs)
          let pixelVal = await extractFieldValue('Pixel Log');
          if (!pixelVal || pixelVal === '(not found)') pixelVal = await extractFieldValue('Pixel Fired');
          if (!pixelVal || pixelVal === '(not found)') pixelVal = await extractFieldValue('pixel_fired');

          let affiliateVal = await extractFieldValue('Affiliate');
          if (!affiliateVal || affiliateVal === '(not found)') affiliateVal = await extractFieldValue('affiliate');

          let dbidVal = await extractFieldValue('DBID');
          if (!dbidVal || dbidVal === '(not found)') dbidVal = await extractFieldValue('Sub ID');

          extracted.disposition = await extractFieldValue('Disposition');

          log(`  Sale Info → Pixel Log="${pixelVal}", Affiliate="${affiliateVal}", DBID="${dbidVal}", Disposition="${extracted.disposition}"`);
          await page.waitForTimeout(1500);
        }

        // ── TAB 3: Vertical Specific ──────────────────────────────────────
        const tab3Opened = await clickLeadTab('Vertical Specific', 3);
        if (tab3Opened) {
          // Use label-based extractor for all ExtJS display fields
          let pageOriginVal = await extractFieldValue('page origin');
          if (!pageOriginVal || pageOriginVal === '(not found)') pageOriginVal = await extractFieldValue('Page Origin');
          if (!pageOriginVal || pageOriginVal === '(not found)') pageOriginVal = await extractFieldValue('page_origin');

          let taxDebtVal = await extractFieldValue('tax_debt');
          if (!taxDebtVal || taxDebtVal === '(not found)') taxDebtVal = await extractFieldValue('Tax Debt');

          let neustarVal = await extractFieldValue('Neustar');
          if (!neustarVal || neustarVal === '(not found)') neustarVal = await extractFieldValue('neustar');

          if (!extracted.disposition || extracted.disposition === '(not found)') {
             extracted.disposition = await extractFieldValue('Disposition');
          }

          log(`  Vertical Specific → Page Origin="${pageOriginVal}", Tax Debt="${taxDebtVal}", Neustar="${neustarVal}", Disposition="${extracted.disposition}"`);
          await page.waitForTimeout(1500);
        }

        // Fallback: if IS Test was not found on tab 1, try reading it from current context
        if (!extracted.isTest) {
          const fallbackCheckbox = page.locator(
            'input[type="checkbox"][id*="test" i], input[type="checkbox"][name*="test" i]'
          ).first();
          if (await fallbackCheckbox.isVisible().catch(() => false))
            extracted.isTest = await fallbackCheckbox.isChecked().catch(() => false);
        }

      } catch (err) {
        log(`Error during tab navigation for lead ${foundLeadId}: ${err.message}`, 'WARN');
      }

      log(`Extracted: First="${extracted.firstName}", Last="${extracted.lastName}", Email="${extracted.email}", IsTest=${extracted.isTest}, Disposition="${extracted.disposition}"`);

      const isNameEmailValid = (
        (extracted.firstName.toUpperCase() === 'CKMTESTPIXEL' || extracted.firstName.toUpperCase() === 'CKMTEST') &&
        (extracted.lastName.toUpperCase() === 'CKMTESTPIXEL' || extracted.lastName.toUpperCase() === 'CKMTEST') &&
        (extracted.email.toLowerCase() === 'ckmtestpixel@gmail.com' || extracted.email.toLowerCase() === 'ckmtest@gmail.com')
      );
      const isTestValid = extracted.isTest;
      const dateStr = formatDateMDY(new Date());

      // Determine Pixel Fired based on Disposition
      let pixelFiredResult = 'Yes';
      if (extracted.disposition && extracted.disposition.toLowerCase() === 'duplicate') {
        pixelFiredResult = 'No';
      }

      rowsToAppend.push([
        dateStr,
        foundLeadId,
        `${ip} : ${count}`,
        isTestValid ? 'True' : 'False',
        isNameEmailValid ? 'Correct' : 'Incorrect',
        pixelFiredResult
      ]);

      // Return to report grid
      log('Returning to Conversions report grid...');
      await page.goBack();
      await page.waitForTimeout(3000);
    }

    // 9. Append findings to Google Sheets and local CSV
    if (rowsToAppend.length > 0) {
      log(`✅ Saving ${rowsToAppend.length} validated IP row(s) to CSV and Google Sheet...`);
      appendToCSV(rowsToAppend);
      await appendToGoogleSheet(rowsToAppend);
    } else {
      log('No validated rows to save. Check if date range has data.', 'WARN');
    }

  } catch (err) {
    log(`FATAL ERROR: ${err.message}`, 'ERROR');
    log(err.stack, 'ERROR');
  } finally {
    await browser.close();
    log('Browser closed. Process complete.');
    log('='.repeat(70));
  }
})();
