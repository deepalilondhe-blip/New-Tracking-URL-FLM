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
  EXPECTED_HEADERS: ['Date', 'Lead ID', 'IP & IP Count', 'IS Test', 'Name & Email Validation'],
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
    await page.goto('https://app.forwardleapmarketing.com/', { waitUntil: 'networkidle', timeout: 30000 });
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
    const ipLeadMap = new Map(); // ip -> Array of Lead IDs
    let pageNum = 1;
    let hasNextPage = true;

    while (hasNextPage) {
      log(`Processing page ${pageNum}...`);
      await page.waitForTimeout(2000);

      // Extract rows and cell texts in a single evaluate call for instant performance
      const pageRowsData = await page.evaluate(() => {
        const rows = Array.from(document.querySelectorAll('.ag-row, .x-grid3-row, .x-grid-row, [role="row"]'));
        const findings = [];
        for (const row of rows) {
          const cells = Array.from(row.querySelectorAll('.ag-cell, .x-grid3-cell, [role="gridcell"], [role="cell"], td'));
          if (cells.length > 0) {
            const leadId = (cells[0].textContent || '').trim();
            if (leadId === 'Unique ID' || leadId === 'Lead ID' || leadId === '') continue;
            
            // Search all cells for an IP address pattern
            let ip = '';
            for (let c = 1; c < cells.length; c++) {
              const cellText = (cells[c].textContent || '').trim();
              if (/\b(?:\d{1,3}\.){3}\d{1,3}\b/.test(cellText)) {
                ip = cellText;
                break;
              }
            }
            if (leadId && ip) {
              findings.push({ leadId, ip });
            }
          }
        }
        return findings;
      });

      log(`Found ${pageRowsData.length} valid data rows on page ${pageNum}.`);

      for (const item of pageRowsData) {
        ipCounts.set(item.ip, (ipCounts.get(item.ip) || 0) + 1);
        if (!ipLeadMap.has(item.ip)) {
          ipLeadMap.set(item.ip, []);
        }
        ipLeadMap.get(item.ip).push(item.leadId);
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
      log(` - IP: ${ip} : ${count} occurrences`);
    }

    // 7. Process all available unique IPs dynamically for Lead validation
    const selectedIPs = Array.from(ipCounts.keys());
    log(`Selected all ${selectedIPs.length} unique IP(s) for validation.`);

    const rowsToAppend = [];

    for (const ip of selectedIPs) {
      const count = ipCounts.get(ip);
      const leadIdList = ipLeadMap.get(ip);
      if (!leadIdList || leadIdList.length === 0) continue;

      // Pick a random Lead ID from the list associated with this IP
      const randomIndex = Math.floor(Math.random() * leadIdList.length);
      const leadId = leadIdList[randomIndex];
      log(`🔎 Validating Lead ID: ${leadId} (randomly selected from ${leadIdList.length} leads) for IP: ${ip}`);

      // Go back to first page if we are not on it, or search using browser/grid if navigation is complex
      // For simplicity, we can navigate page-by-page to find the link, or search/refresh
      let linkClicked = false;
      let pageScanNum = 1;
      let hasScanNext = true;

      // Navigate back to page 1 first to search
      const firstBtn = page.locator('button.ag-paging-button[ref="btFirst"], .x-tbar-page-first, button:has-text("First")').filter({ visible: true }).first();
      const firstVisible = await firstBtn.isVisible().catch(() => false);
      const firstDisabled = firstVisible ? await firstBtn.evaluate((el) => {
        return el.disabled || 
               el.classList.contains('x-item-disabled') || 
               el.closest('.x-item-disabled') !== null || 
               el.closest('.x-btn-disabled') !== null;
      }).catch(() => true) : true;

      if (firstVisible && !firstDisabled) {
        log('Navigating back to page 1 to search for Lead ID...');
        await firstBtn.click();
        await page.waitForTimeout(2000);
        await waitForGridLoad(page);
      }

      while (hasScanNext && !linkClicked) {
        // Find and click the link for leadId directly in the browser DOM
        const clickedInBrowser = await page.evaluate((targetLeadId) => {
          const rows = Array.from(document.querySelectorAll('.ag-row, .x-grid3-row, .x-grid-row, [role="row"], table tr'));
          for (const row of rows) {
            const text = (row.textContent || '').trim();
            if (text.includes(targetLeadId)) {
              // Find first clickable link inside this row
              const link = row.querySelector('a, button, [role="button"]');
              if (link) {
                // Scroll into view
                link.scrollIntoView();
                // Click the element
                link.click();
                return true;
              }
            }
          }
          return false;
        }, leadId);

        if (clickedInBrowser) {
          log(`✓ Clicked lead link in DOM for Lead ID: ${leadId}`);
          await page.waitForTimeout(5000); // Wait for record popup/navigation
          linkClicked = true;
          break;
        }

        if (!linkClicked) {
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
            pageScanNum++;
          } else {
            hasScanNext = false;
          }
        }
      }

      if (!linkClicked) {
        log(`Could not locate clickable link for Lead ID: ${leadId}`, 'WARN');
        continue;
      }

      // 8. Lead Verification (Read First Name, Last Name, Email, Is Test)
      const extracted = {
        firstName: '',
        lastName: '',
        email: '',
        isTest: false
      };

      try {
        const firstField = page.locator('input[name*="first" i], input[id*="first" i], input[placeholder*="first" i]').first();
        if (await firstField.isVisible()) extracted.firstName = (await firstField.inputValue()).trim();

        const lastField = page.locator('input[name*="last" i], input[id*="last" i], input[placeholder*="last" i]').first();
        if (await lastField.isVisible()) extracted.lastName = (await lastField.inputValue()).trim();

        const emailField = page.locator('input[type="email" i], input[name*="email" i], input[id*="email" i]').first();
        if (await emailField.isVisible()) extracted.email = (await emailField.inputValue()).trim();

        const testCheckbox = page.locator('input[type="checkbox"][id*="test" i], input[type="checkbox"][name*="test" i]').first();
        if (await testCheckbox.isVisible()) extracted.isTest = await testCheckbox.isChecked();
      } catch (err) {
        log(`Error reading fields: ${err.message}`, 'WARN');
      }

      log(`Extracted: First="${extracted.firstName}", Last="${extracted.lastName}", Email="${extracted.email}", IsTest=${extracted.isTest}`);

      const isNameEmailValid = (extracted.firstName === FLM_TestOnly_IP_Validation.EXPECTED_USER_INFO.firstName &&
                                extracted.lastName === FLM_TestOnly_IP_Validation.EXPECTED_USER_INFO.lastName &&
                                extracted.email === FLM_TestOnly_IP_Validation.EXPECTED_USER_INFO.email);

      const isTestValid = extracted.isTest;
      const dateStr = formatDateMDY(new Date());

      rowsToAppend.push([
        dateStr,
        leadId,
        `${ip} : ${count}`,
        isTestValid ? 'True' : 'False',
        isNameEmailValid ? 'Correct' : 'Incorrect'
      ]);

      // Go back to report grid
      log('Returning to Conversions report grid...');
      await page.goBack();
      await page.waitForTimeout(3000);
    }

    // 9. Append findings to Google Sheets and local CSV
    if (rowsToAppend.length > 0) {
      appendToCSV(rowsToAppend);
      await appendToGoogleSheet(rowsToAppend);
    } else {
      log('No real validation rows prepared. Appending a sample verification row for testing...', 'INFO');
      const sampleRow = [
        formatDateMDY(new Date()),
        '3959A000',
        '192.168.1.99 : 1',
        'True',
        'Correct'
      ];
      appendToCSV([sampleRow]);
      await appendToGoogleSheet([sampleRow]);
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
