// utils/flmAgent/test_only_ip_validation.js
// ---------------------------------------------------------------
// FLM Agent – Cake Test Only IP Validation & Google Sheet Update
// ---------------------------------------------------------------
// This script is a **stand‑alone** automation that does NOT interfere with any
// existing Cake workflows. It logs into ForwardLeap Marketing (Cake), pulls the
// "Test Only" conversion report, aggregates IP occurrence counts across **all**
// pagination pages, validates the first three unique IPs against their Lead
// details, and finally appends the results to the "Test only IP Data" tab of the
// Google Sheet.
//
// ────── Prerequisites ──────
//   • Node.js >= 14
//   • Playwright (`npm i -D playwright`)
//   • `node-fetch` for Google‑Sheets API calls (`npm i node-fetch@2`)
//   • Environment variables for authentication:
//       * CAKE_USERNAME – Cake login email
//       * CAKE_PASSWORD – Cake password
//       * SHEET_ID    – Google Sheet ID (the part after /d/ in the URL)
//       * SHEET_TOKEN – OAuth2 Bearer token (service‑account or user token)
//   • A tiny helper file `scheduler_last_run.txt` that stores the date of the
//     most recent scheduler execution (used for the dynamic start date).
//
// ────── High‑level Flow ──────
// 1️⃣  Determine start‑date (latest scheduler run) and end‑date (today).
// 2️⃣  Launch Playwright, log into Cake, and navigate to the Conversion report.
// 3️⃣  Apply filters (date range, "Test Only").
// 4️⃣  Iterate through **all** pagination pages, building a map:
//        { ipAddress → { count, leadIds: Set<string> } }
// 5️⃣  Pick the first three unique IPs (in discovery order).
// 6️⃣  For each IP, open one of its Lead IDs and validate fields.
// 7️⃣  Append a row to the Google Sheet with:
//        Date, Lead ID, "IP : COUNT", IS‑Test status, Name‑Email validation.
// ---------------------------------------------------------------

const { chromium } = require('playwright');
const fetch = require('node-fetch');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

// --------------------------- Configuration ---------------------------
const CAKE_URL = 'https://app.forwardleapmarketing.com/newaff.aspx';
const SHEET_TAB_NAME = 'Test only IP Data';
const SHEET_ID = process.env.SHEET_ID; // e.g. 1fO1YFFIM-i_DRPLqdSqC4oECeAHEETPJmN6RWlTrLzU
const SHEET_TOKEN = process.env.SHEET_TOKEN; // Bearer token for Sheets API

// Helper to format dates as required by the sheet (YYYY‑MM‑DD)
function formatDateYMD(date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

// Read the *latest scheduler* date from a tiny file. If missing, fall back to
// yesterday.
function getLatestSchedulerDate() {
  const filePath = path.resolve(__dirname, '../../logs/scheduler/.last_processed_lead.txt');
  try {
    const raw = fs.readFileSync(filePath, 'utf8').trim();
    if (/\d{4}-\d{2}-\d{2}/.test(raw)) return raw;
  } catch (e) {}
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  return formatDateYMD(yesterday);
}

// Append a single row to the Google Sheet using the Sheets API (v4).
async function appendRowToSheet(rowArray) {
  const url = `https://sheets.googleapis.com/v4/spreadsheets/${SHEET_ID}/values/${encodeURIComponent(SHEET_TAB_NAME)}!A:E:append?valueInputOption=RAW`;
  const response = await fetch(url, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${SHEET_TOKEN}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ values: [rowArray] }),
  });
  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Failed to append to sheet: ${response.status} ${text}`);
  }
  console.log('✅ Row appended to Google Sheet:', rowArray);
}

// --------------------------- Main Logic ---------------------------
(async () => {
  const startDate = getLatestSchedulerDate(); // dynamic start date
  const endDate = formatDateYMD(new Date()); // today

  console.log('\n🚀 Starting Test‑Only IP validation');
  console.log(`   Date range → ${startDate} → ${endDate}`);

const headless = !process.argv.includes('--headed');
  const browser = await chromium.launch({ headless });
  const context = await browser.newContext();
  const page = await context.newPage();

  // ---- 1. Login to Cake -------------------------------------------------
  await page.goto(CAKE_URL, { waitUntil: 'networkidle' });
  const username = process.env.CAKE_USERNAME;
  const password = process.env.CAKE_PASSWORD;
  if (!username || !password) {
    throw new Error('CAKE_USERNAME and CAKE_PASSWORD environment variables must be set');
  }
  // Wait for email/username field and fill it
  await page.waitForSelector('input[name="email"], input[name="username"], input[type="email"]');
  const emailInput = page.locator('input[name="email"], input[name="username"], input[type="email"]').first();
  await emailInput.fill(username);
  // Wait for password field and fill it
  await page.waitForSelector('input[name="password"], input[type="password"]');
  const passwordInput = page.locator('input[name="password"], input[type="password"]').first();
  await passwordInput.fill(password);
  // Submit the login form (assume a button of type submit or with text "Sign In")
  await Promise.all([
    page.waitForNavigation({ waitUntil: 'networkidle' }),
    page.click('button[type="submit"], button:has-text("Sign In"), button:has-text("Log In")'),
  ]);
  console.log('✅ Logged into Cake');

  // ---- 2. Navigate to Conversion Report -----------------------------------
  await page.click('text=Reports');
  await page.click('text=Conversions');
  await page.waitForLoadState('networkidle');

  // ---- 3. Apply Filters ---------------------------------------------------
  await page.fill('input[placeholder="Start Date"]', startDate);
  await page.fill('input[placeholder="End Date"]', endDate);
  await page.selectOption('select[name="filter2"]', { label: 'Test Only' });
  await Promise.all([
    page.waitForResponse(resp => resp.url().includes('report') && resp.status() === 200),
    page.click('button:has-text("Run")'),
  ]);
  console.log('✅ Report generated');

  // ---- 4. Pagination & IP aggregation ------------------------------------
  const ipMap = new Map(); // ip -> { count, leadIds: Set }

  async function extractCurrentPage() {
    const rows = await page.$$('[data-test="report-row"]');
    for (const row of rows) {
      const ip = await row.$eval('td.ip', el => el.textContent.trim());
      const leadId = await row.$eval('td.lead-id', el => el.textContent.trim());
      if (!ip) continue;
      if (!ipMap.has(ip)) ipMap.set(ip, { count: 0, leadIds: new Set() });
      const entry = ipMap.get(ip);
      entry.count += 1;
      if (leadId) entry.leadIds.add(leadId);
    }
  }

  async function getTotalPages() {
    const paginationText = await page.textContent('.pagination-info');
    const match = paginationText && paginationText.match(/of\s+(\d+)/i);
    if (!match) return 1;
    const totalRecords = parseInt(match[1], 10);
    const recordsPerPage = 200;
    return Math.ceil(totalRecords / recordsPerPage);
  }

  const totalPages = await getTotalPages();
  console.log(`🔢 Total pages to process: ${totalPages}`);

  for (let current = 1; current <= totalPages; current++) {
    console.log(`📄 Processing page ${current}/${totalPages}`);
    await extractCurrentPage();
    if (current < totalPages) {
      await Promise.all([
        page.waitForLoadState('networkidle'),
        page.click('button:has-text("Next")'),
      ]);
    }
  }

  console.log(`🧮 Aggregated ${ipMap.size} unique IPs`);

  // ---- 5. Process all unique IPs -----------------------------------
  const allIPs = Array.from(ipMap.keys());
  console.log('🚦 Processing', allIPs.length, 'unique IPs');
  
  // ---- 6. Lead validation for each IP -----------------------------------
  for (const ip of allIPs) {
    const { count, leadIds } = ipMap.get(ip);
    const anyLeadId = leadIds.values().next().value;
    if (!anyLeadId) {
      console.warn(`⚠️ No Lead ID for IP ${ip}, skipping`);
      continue;
    }
    console.log(`🔎 Validating Lead ${anyLeadId} for IP ${ip}`);
    const { leadId, isTestStatus, nameEmailStatus } = await validateLead(anyLeadId);
    const row = [
      formatDateYMD(new Date()),
      leadId,
      `${ip} : ${count}`,
      isTestStatus,
      nameEmailStatus,
    ];
    await appendRowToSheet(row);
  }

  await browser.close();
  console.log('🎉 All done!');
})().catch(err => {
  console.error('❌ Automation failed:', err);
  process.exit(1);
});
