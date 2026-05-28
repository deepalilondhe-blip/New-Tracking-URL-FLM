# Cake Test Only Validation Script

## 📌 Overview

This is an **INDEPENDENT** automation script that validates "Test Only" conversion records in Cake CRM. It operates completely separately from the existing `cake.js` (Test & Non-Test process) and does not modify or interfere with that workflow.

### ✅ Key Features

- **Completely Isolated**: Runs independently from existing Cake processes
- **Test Only Filter**: Applies specific "Test Only" filter to conversion records
- **Automatic Date Range**: Uses scheduler-based date range (yesterday to today)
- **IP Validation**: Extracts and validates IP addresses from test records
- **Test User Verification**: Validates against expected test user:
  - First Name: `CKMTESTPIXEL`
  - Last Name: `CKMTESTPIXEL`
  - Email: `ckmtestpixel@gmail.com`
- **Auto Notifications**: Sends email to developer when mismatches found
- **Detailed Logging**: Creates timestamped logs and reports
- **Screenshots**: Captures screenshots of test records and failures

---

## 🚀 Quick Start

### Option 1: Batch File (Recommended)
Double-click the batch file:
```
run_test_only_validation.bat
```

### Option 2: Command Line
```bash
cd "C:\Users\Deepali_Londhe\Desktop\New Tracking URL"
node CakeProcess.js\cake_test_only.js --headed
```

### Option 3: Headless Mode (Faster)
```bash
node CakeProcess.js\cake_test_only.js
```

---

## 📊 Execution Flow

```
1. ✓ Setup & Initialize Logging
   ├─ Create output directories
   ├─ Setup logging file
   └─ Initialize configuration

2. ✓ Browser Setup
   ├─ Launch Chromium browser
   ├─ Load authentication state
   └─ Navigate to Cake CRM

3. ✓ Navigate & Filter
   ├─ Click REPORTS menu
   ├─ Click Conversions
   ├─ Set scheduler-based date range
   └─ Apply "Test Only" filter

4. ✓ Extract Records
   ├─ Access conversion grid
   ├─ Extract all visible rows
   ├─ Identify unique IP addresses
   └─ Log statistics

5. ✓ Validate Test User (for first IP)
   ├─ Open Unique ID record
   ├─ Extract user information
   ├─ Verify against expected values
   └─ Capture screenshot

6. ✓ Handle Failures
   ├─ Extract Lead ID if mismatch
   ├─ Capture failure screenshot
   └─ Send notification email

7. ✓ Generate Report
   ├─ Create JSON execution report
   ├─ Log summary statistics
   └─ Close browser
```

---

## 📁 Output Files

All outputs are stored in `CakeProcess.js/` directory:

### 📂 test_only_reports/
```
├─ execution_[timestamp].log          (Detailed execution log)
└─ test_only_report_[timestamp].json  (JSON report with validation results)
```

### 📂 test_only_screenshots/
```
├─ 01_after_test_only_filter_[timestamp].png      (Filter applied)
├─ 02_unique_id_record_ip_[IP]_[timestamp].png    (Record opened)
└─ 03_validation_failure_ip_[IP]_[timestamp].png  (Failure screenshot)
```

### Log File Example
```
[2026-05-27T11:03:59.286Z] [INFO] Cake Test Only Validation Process Started
[2026-05-27T11:03:59.500Z] [INFO] Launching browser
[2026-05-27T11:04:02.100Z] [INFO] Navigating to Cake CRM
[2026-05-27T11:04:05.300Z] [INFO] Navigating to Cake Reports > Conversions
...
```

### Report JSON Example
```json
{
  "executionTime": "2026-05-27T11:03:59.286Z",
  "dateRange": {
    "start": "2026-05-26",
    "end": "2026-05-27"
  },
  "recordsFound": 45,
  "uniqueIPs": ["192.168.1.100", "192.168.1.101"],
  "validationResults": [
    {
      "ip": "192.168.1.100",
      "isValid": false,
      "extracted": {
        "firstName": "TestUser",
        "lastName": "CKMTESTPIXEL",
        "email": "ckmtestpixel@gmail.com"
      },
      "mismatches": [
        {
          "field": "firstName",
          "expected": "CKMTESTPIXEL",
          "extracted": "TestUser"
        }
      ],
      "leadId": "12345"
    }
  ],
  "summary": {
    "total": 1,
    "passed": 0,
    "failed": 1,
    "failedLeadIds": ["12345"]
  }
}
```

---

## ⚙️ Configuration

### Environment Variables (.env)

Ensure your `.env` file contains:

```env
# Email Configuration
EMAIL_USER=your_email@gmail.com
EMAIL_PASS=your_gmail_app_password
DEVELOPER_EMAIL=urvish.patel@bytestechnolab.com

# Optional: Cake Credentials (if manual login needed)
CAKE_USERNAME=your_username
CAKE_PASSWORD=your_password
```

### Custom Test User Configuration

To modify expected test user values, edit the `CONFIG.TEST_USER_INFO` in `cake_test_only.js`:

```javascript
const CONFIG = {
  TEST_USER_INFO: {
    firstName: 'CKMTESTPIXEL',
    lastName: 'CKMTESTPIXEL',
    email: 'ckmtestpixel@gmail.com'
  },
  DEVELOPER_EMAIL: 'urvish.patel@bytestechnolab.com'
};
```

---

## 📧 Email Notifications

When test user validation fails, an automated email is sent to the developer with:

### Email Content
```
Subject: [FLM Automation] Test User Validation Failed - Lead ID: [ID]

Body includes:
- IP Address of the failed record
- Lead ID for investigation
- Detailed mismatch information (field-by-field comparison)
- Expected vs. Extracted values
- Action required notice
```

### Email Recipient
- Default: `urvish.patel@bytestechnolab.com`
- Can be customized via `DEVELOPER_EMAIL` environment variable

---

## 🔍 Validation Rules

### ✓ Pass Condition
All three fields must match EXACTLY:
- First Name = `CKMTESTPIXEL`
- Last Name = `CKMTESTPIXEL`
- Email = `ckmtestpixel@gmail.com`

### ✗ Fail Condition
Any field that doesn't match triggers:
1. Lead ID extraction
2. Screenshot capture
3. Email notification to developer
4. Failed entry in report

---

## 🛠️ Shared Utilities (cake_utils.js)

The script uses common utilities from `cake_utils.js`:

| Function | Purpose |
|----------|---------|
| `launchBrowser()` | Launch Chromium with fallback options |
| `getSchedulerDateRange()` | Get date range (yesterday to today) |
| `captureScreenshot()` | Save PNG screenshot |
| `sendEmail()` | Send notification emails |
| `writeLog()` | Write timestamped log entries |
| `saveReport()` | Save JSON reports |
| `generateEmailTemplate()` | Create HTML email template |
| `navigateToCake()` | Navigate to Cake CRM |

---

## 🔒 Data Isolation & Safety

### ✅ Complete Independence
- **Separate Script**: `cake_test_only.js` (NOT modifying `cake.js`)
- **Separate Reports**: Stored in `test_only_reports/` directory
- **Separate Screenshots**: Stored in `test_only_screenshots/` directory
- **Separate Logs**: Individual timestamp-based log files

### ✅ Existing Cake Process Unaffected
The original `cake.js` (Test & Non-Test process) remains:
- Completely untouched
- Fully functional
- Independent and isolated

### ✅ No Shared State
- Each execution is independent
- No modification of authentication state
- No interference with scheduled processes

---

## 📋 Command Line Arguments

| Argument | Effect |
|----------|--------|
| `--headed` | Run browser in visible mode (can watch process) |
| (none) | Run in headless mode (faster, no visual feedback) |

### Example Usage
```bash
# With visible browser
node cake_test_only.js --headed

# Headless (faster)
node cake_test_only.js

# Using batch file (includes --headed by default)
run_test_only_validation.bat
```

---

## 🐛 Troubleshooting

### Browser Won't Launch
```
Solution: Ensure Chrome/Chromium is installed
- Download from: https://www.google.com/chrome/
- Or try headless mode (remove --headed)
```

### Navigation Fails
```
Solution: Check Cake URL and authentication state
- Verify CAKE_USERNAME and CAKE_PASSWORD in .env
- Check internet connection
- Verify cake-auth-state.json exists
```

### Email Not Sending
```
Solution: Check email configuration in .env
- Verify EMAIL_USER is correct Gmail address
- Use Gmail App Password (not regular password)
- Enable "Less Secure App Access" if needed
- Check spam/junk folder
```

### Date Range Not Set
```
Solution: Page selectors may have changed
- Check browser console for errors (add debugging)
- Verify date input field selectors exist
- Manually verify Cake UI structure
```

### Filter Not Applied
```
Solution: Check "Test Only" checkbox selector
- The selector may need updating based on current Cake UI
- Verify filter element exists on page
- Check for JavaScript errors in console
```

---

## 📈 Performance

| Metric | Typical Value |
|--------|---------------|
| Browser Launch | 5-10 seconds |
| Navigation | 5-8 seconds |
| Filter & Search | 3-5 seconds |
| Record Validation | 2-4 seconds |
| Email Send | 1-3 seconds |
| **Total Duration** | **20-40 seconds** |

**Note**: Times may vary based on:
- Internet connection speed
- Cake server performance
- Number of test records
- Email service latency

---

## 📝 Log Levels

Logs include different severity levels:

| Level | Color | Meaning |
|-------|-------|---------|
| `[INFO]` | Blue | Informational message |
| `[WARN]` | Yellow | Warning (non-critical issue) |
| `[ERROR]` | Red | Error (validation failure) |
| `[FATAL]` | Red Bold | Critical failure |

---

## 🔄 Reusable Utilities

These functions in `cake_utils.js` can be reused for other Cake automation:

```javascript
// Common utilities
utils.launchBrowser(true)               // Launch browser
utils.getSchedulerDateRange()           // Get date range
utils.navigateToCake(page)              // Go to Cake
utils.captureScreenshot(page, 'name')   // Take screenshot
utils.sendEmail(subject, html)          // Send email
utils.writeLog(logFile, message)        // Write log
utils.saveReport(data, filename)        // Save JSON report
```

---

## 📞 Support

For issues, improvements, or questions:
- Check the log files in `test_only_reports/`
- Review screenshots in `test_only_screenshots/`
- Verify .env configuration
- Check Cake CRM connectivity

---

## Version & History

- **v1.0.0** (2026-05-27)
  - Initial Test Only validation script
  - Independent from existing cake.js
  - Full test user verification
  - Automated email notifications
  - Detailed logging and reporting

---

## Important Notes

⚠️ **DO NOT MODIFY**: The existing `cake.js` script (Test & Non-Test process)

✅ **USE THIS SCRIPT**: `cake_test_only.js` for Test Only validation

✅ **RUN INDEPENDENTLY**: This script can be scheduled separately from `cake.js`

✅ **SAFE TO USE**: Complete isolation ensures no impact on existing processes

---

**Happy Testing! 🎉**
