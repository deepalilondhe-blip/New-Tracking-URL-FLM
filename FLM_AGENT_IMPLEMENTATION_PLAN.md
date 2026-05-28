


# FLM Agent Implementation Plan
## Test & Non Test Filter (Cake Process) + Lead Validation

**Version:** 1.0  
**Date:** May 27, 2026  
**Status:** In Development

---

## 📌 Overview

This document outlines the implementation of two core FLM Agent processes:

1. **Test & Non Test Filter** – Cake process to identify and extract test vs. non-test leads
2. **Lead Validation** – Automated validation of latest leads across Cake and CDB systems

Both processes are designed to run **independently** from existing campaign automation, with isolated Playwright contexts and dedicated logging/reporting.

---

## 🎯 Part 1: Test & Non Test Filter (Cake Process)

### Purpose
- Apply **QA Affiliate** filter in Cake conversion reports
- Identify test leads (red rows in **Test** column)
- Extract and validate **Lead IDs** from failed/red rows
- Send extracted identifiers to developer email

### Implementation Steps

#### Step 1: Prerequisite Selectors & Data Points

**Required Selectors:**
```javascript
// Apply QA Affiliate Filter
const qaFilterSelector = 'input[type="checkbox"][value*="QA"], label:has-text("QA Affiliate")';

// Test Column (for color detection)
const testColumnCells = 'table tr td:nth-child(N), [role="gridcell"]'; // N = Test column index

// Red Row Indicator
const redRowCSS = 'background-color: rgb(255, 0, 0)' or 'color: red';

// Lead ID Extraction from row
const leadIdInRow = 'td[data-lead-id], td:nth-child(M)'; // M = Lead ID column
```

**Environment Variables (`.env`):**
```
CAKE_TEST_FILTER_DEVELOPER_EMAIL=urvish.patel@bytestechnolab.com
CAKE_REPORTS_URL=https://app.forwardleapmarketing.com/Reports/Conversions
CAKE_SESSION_STATE=./CakeProcess.js/cake-auth-state.json
TEST_COLUMN_COLOR_CODE=rgb(255, 0, 0)
```

#### Step 2: Script Structure (`run-test-non-test.js`)

**Location:** `./run-test-non-test.js`

**Command to Run:**
```bash
node run-test-non-test.js --headed --hold=180
```

**Core Functions:**

```javascript
// 1. Navigate to Cake Reports
async function navigateToCakeReports(page)

// 2. Apply QA Affiliate Filter
async function applyQaAffiliateFilter(page)

// 3. Identify and scan Test column
async function scanTestColumn(page)

// 4. Extract red row Lead IDs
async function extractRedRowLeadIds(page)
  - Get all rows in conversion grid
  - Check Test column color
  - If color === RED: extract Lead ID from same row
  - Return array of failed Lead IDs

// 5. Send email notification
async function sendRedLeadIdsEmail(failedLeadIds, developerEmail)
  - Subject: "🔴 [FLM Agent] Red Test Leads Detected"
  - Body: List of Lead IDs
  - Optional: Attach screenshot of grid

// 6. Log execution
async function logExecutionStep(stepName, status, details)
```

#### Step 3: Execution Flow

```
┌─────────────────────────────────────────┐
│ 1. Load Cake Session (cake-auth-state)  │
└───────────┬─────────────────────────────┘
            ↓
┌─────────────────────────────────────────┐
│ 2. Navigate to Cake Reports/Conversions │
└───────────┬─────────────────────────────┘
            ↓
┌─────────────────────────────────────────┐
│ 3. Apply QA Affiliate Filter            │
└───────────┬─────────────────────────────┘
            ↓
┌─────────────────────────────────────────┐
│ 4. Set Date Range (from scheduler)      │
└───────────┬─────────────────────────────┘
            ↓
┌─────────────────────────────────────────┐
│ 5. Verify Test & Non-Test Counts        │
└───────────┬─────────────────────────────┘
            ↓
┌─────────────────────────────────────────┐
│ 6. Highlight Red Rows in Test Column    │
└───────────┬─────────────────────────────┘
            ↓
┌─────────────────────────────────────────┐
│ 7. Extract Lead IDs from Red Rows       │
└───────────┬─────────────────────────────┘
            ↓
┌─────────────────────────────────────────┐
│ 8. Send Email with Failed Lead IDs      │
│    TO: urvish.patel@bytestechnolab.com  │
└───────────┬─────────────────────────────┘
            ↓
┌─────────────────────────────────────────┐
│ 9. Log Summary & Close Browser          │
└─────────────────────────────────────────┘
```

#### Step 4: Email Template

**From:** `process.env.EMAIL_USER`  
**To:** `urvish.patel@bytestechnolab.com`  
**Subject:** `[FLM Agent] Test & Non-Test Filter Results`

**Body:**
```html
<h2>🔴 Test & Non-Test Filter Report</h2>

<p><strong>Execution Time:</strong> [ISO timestamp]</p>
<p><strong>Filter Applied:</strong> QA Affiliate</p>
<p><strong>Date Range:</strong> [Start] to [End]</p>

<h3>Red Test Rows Detected: [COUNT]</h3>

<h4>Failed Lead IDs:</h4>
<ul>
  <li>[LEAD_ID_1]</li>
  <li>[LEAD_ID_2]</li>
  ...
</ul>

<p><strong>Action Required:</strong> Investigate these leads for test validation failures.</p>

<hr>
<p><em>FLM Agent | Automated Report</em></p>
```

---

## 🚀 Part 2: Lead Validation (Independent Script)

### Purpose
- Extract **latest Lead ID** from most recent scheduler execution
- Validate lead exists in **Cake system**
- Validate lead exists in **CDB system**
- Update **month-based FML Project dashboard** with results

### Implementation Status

✅ **COMPLETED:** `utils/flmAgent/validate_latest_lead.js`

### Command to Run

```bash
node utils/flmAgent/validate_latest_lead.js --headed
```

### Process Flow

```
┌──────────────────────────────────────────┐
│ 1. Find latest scheduler run log         │
│    (from logs/scheduler/)                │
└───────────┬────────────────────────────────┘
            ↓
┌──────────────────────────────────────────┐
│ 2. Extract latest Lead ID from log       │
│    (regex: leadid: "XXXXXXXX")           │
└───────────┬────────────────────────────────┘
            ↓
┌──────────────────────────────────────────┐
│ 3. Launch Playwright (headed mode)       │
└───────────┬────────────────────────────────┘
            ↓
┌──────────────────────────────────────────┐
│ 4. Cake Verification                     │
│   - Open Cake Reports                    │
│   - Search for Lead ID                   │
│   - Check "IS Test" checkbox status      │
│   - Capture screenshot                   │
└───────────┬────────────────────────────────┘
            ↓
┌──────────────────────────────────────────┐
│ 5. CDB Verification                      │
│   - Login to CDB                         │
│   - Navigate to Lead Listing             │
│   - Search for same Lead ID              │
│   - Return FOUND or NOT FOUND            │
└───────────┬────────────────────────────────┘
            ↓
┌──────────────────────────────────────────┐
│ 6. Append Results to Google Sheet        │
│   - Sheet: "FML Project YYYY-MM"         │
│   - Columns: Lead ID, Cake Status, etc.  │
└───────────┬────────────────────────────────┘
            ↓
┌──────────────────────────────────────────┐
│ 7. Report Summary & Exit                 │
└──────────────────────────────────────────┘
```

### Output Example

```
═══════════════════════════════════════════════════
🚀 FLM Agent – Validate Latest Lead (Isolated)
═══════════════════════════════════════════════════

📂 [Step 1] Extracting latest Lead ID from scheduler logs...
✓ Using scheduler log: scheduler_run_20262705_150001.log
✓ Latest Lead ID extracted: 9014B21A

🌐 [Step 2] Launching browser in headed mode...
✓ Browser launched

═ Cake Verification Started ═
📋 [Cake Verification] Searching for Lead ID: 9014B21A
✓ Searched for Lead ID: 9014B21A
✓ Clicked on Lead ID link
✓ IS Test status: UNCHECKED
📊 Cake Result: Found=true, IsTest=false

═ CDB Verification Started ═
🔐 [CDB Verification] Searching for Lead ID: 9014B21A
✓ CDB login attempted
✓ Searched in CDB for Lead ID
✓ Lead ID FOUND in CDB
📊 CDB Status: FOUND

📈 [Step 5] Appending results to Google Sheet dashboard...
✅ Row appended to dashboard: FML Project 2026-05

═══════════════════════════════════════════════════
📋 Validation Summary:
  Lead ID: 9014B21A
  Cake Found: ✅ YES
  Cake IS Test: ❌ NO
  CDB Status: FOUND
═══════════════════════════════════════════════════

✓ Lead 9014B21A successfully validated in both systems
✓ Browser closed. Process complete.
```

---

## 🔧 Environment Configuration (`.env`)

Add the following variables to your `.env` file:

```env
# Cake System Credentials
CAKE_USERNAME=your_cake_username
CAKE_PASSWORD=your_cake_password

# CDB System Credentials
CDB_EMAIL=nirav.dobariya@bytestechnolab.com
CDB_PASSWORD=Nirav@1234

# Email Configuration
EMAIL_USER=your_email@gmail.com
EMAIL_PASS=your_app_password
CAKE_TEST_FILTER_DEVELOPER_EMAIL=urvish.patel@bytestechnolab.com

# Google Sheets
GOOGLE_SHEET_ID=your_sheet_id
GOOGLE_SERVICE_ACCOUNT_FILE=./service-account-creds.json

# URLs
CAKE_REPORTS_URL=https://app.forwardleapmarketing.com/Reports/Conversions
CDB_LOGIN_URL=https://www.flmreporting.com/flm_central_leads/auth/login.php
```

---

## 📌 Run Commands

### Test & Non Test Filter (To be added later)
```bash
node run-test-non-test.js --headed --hold=180
```

### Lead Validation (Ready to Use)
```bash
node utils/flmAgent/validate_latest_lead.js --headed
```

### Schedule Both (via scheduler)
```bash
# Add to scheduler.js every 2 hours:
# 1. Test & Non Test Filter
# 2. Lead Validation (after lead is submitted)
```

---

## 📊 Dashboard Integration

### Sheet Structure
**Spreadsheet:** FML Project  
**Monthly Sheets:** `FML Project 2026-01`, `FML Project 2026-02`, etc.

**Columns:**
- DateTime
- Type (Lead Validation, Test Filter, etc.)
- Lead ID
- Cake Found (Yes/No)
- Is Test (Yes/No)
- CDB Status (FOUND/NOT FOUND)
- CDB Email
- Screenshots (links)
- Additional metadata

---

## 🔮 Future Enhancements

1. **Parallel Execution:** Run Cake & CDB verifications in parallel for speed
2. **Webhook Notifications:** Send alerts to Slack/Teams on failures
3. **Historical Tracking:** Build lead validation trend reports
4. **Automated Remediation:** Auto-flag and trigger reviews for failed leads
5. **API Integration:** Direct API validation for even faster checks

---

## ✅ Checklist

### Part 1: Test & Non Test Filter
- [ ] Create `run-test-non-test.js` script
- [ ] Add QA Affiliate filter logic
- [ ] Add red row detection in Test column
- [ ] Implement Lead ID extraction
- [ ] Add email notification sender
- [ ] Test in headed mode (180s hold)
- [ ] Add command to `Run Commands.txt`
- [ ] Integrate into scheduler

### Part 2: Lead Validation
- [x] Create `utils/flmAgent/validate_latest_lead.js`
- [x] Implement scheduler log parsing
- [x] Add Cake verification logic
- [x] Add CDB verification logic
- [x] Implement Google Sheets append
- [x] Add screenshot capturing
- [ ] Test end-to-end in headed mode
- [ ] Document run command in `Run Commands.txt`
- [ ] Set up scheduler integration

---

## 📞 Support & Debugging

**Logs Location:** `./logs/flm_agent_screenshots/`  
**Scheduler Logs:** `./logs/scheduler/scheduler_run_*.log`  
**Google Sheet:** FML Project dashboard (month-based)

**Common Issues:**
1. **Lead not found in Cake:** Check if session is expired (renew cake-auth-state.json)
2. **CDB login fails:** Verify credentials in `.env`
3. **Google Sheets append fails:** Verify GOOGLE_SHEET_ID and permissions
4. **Screenshots not saving:** Ensure `logs/flm_agent_screenshots/` directory exists

---

**Last Updated:** May 27, 2026  
**Next Review:** After first full test run  
**Owner:** FLM Agent Development Team
