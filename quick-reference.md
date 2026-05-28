# Quick Reference Guide - Cake Automation Scripts

## 🎯 At a Glance

| Script | Purpose | Filter | Output Location | Launch |
|--------|---------|--------|-----------------|--------|
| **cake.js** | Test & Non-Test validation | Tests & Non-Tests | `CakeProcess.js/` | (existing) |
| **cake_test_only.js** | Test user validation | Test Only | `test_only_reports/` | `run_test_only_validation.bat` |

---

## ⚡ Quick Start Commands

### Run Test Only Validation (New)
```bash
# Using batch file (easiest)
run_test_only_validation.bat

# Or command line with visible browser
node CakeProcess.js\cake_test_only.js --headed

# Or command line headless (faster)
node CakeProcess.js\cake_test_only.js
```

### Run Existing Process
```bash
# Original Cake process (Test & Non-Test)
node CakeProcess.js\cake.js --non-test-procedure --headed
```

---

## 📂 Output Locations

### Test Only Script Outputs
```
CakeProcess.js/
├── test_only_reports/
│   ├── execution_[timestamp].log           ← Read this for detailed logs
│   └── test_only_report_[timestamp].json   ← Read this for validation results
│
└── test_only_screenshots/
    ├── 01_after_test_only_filter_*.png    ← After filter applied
    ├── 02_unique_id_record_*.png          ← Record details
    └── 03_validation_failure_*.png        ← Failures if any
```

---

## ✅ Validation Results

### Passed Test
```json
{
  "ip": "192.168.1.100",
  "isValid": true,
  "extracted": {
    "firstName": "CKMTESTPIXEL",
    "lastName": "CKMTESTPIXEL",
    "email": "ckmtestpixel@gmail.com"
  },
  "mismatches": [],
  "leadId": null
}
```

### Failed Test
```json
{
  "ip": "192.168.1.101",
  "isValid": false,
  "extracted": {
    "firstName": "WrongName",
    "lastName": "CKMTESTPIXEL",
    "email": "ckmtestpixel@gmail.com"
  },
  "mismatches": [
    {
      "field": "firstName",
      "expected": "CKMTESTPIXEL",
      "extracted": "WrongName"
    }
  ],
  "leadId": "12345"
}
```

---

## 🔧 Configuration

### Required in .env
```env
EMAIL_USER=your_email@gmail.com
EMAIL_PASS=your_gmail_app_password
DEVELOPER_EMAIL=urvish.patel@bytestechnolab.com
```

### Optional in .env
```env
CAKE_USERNAME=your_username
CAKE_PASSWORD=your_password
```

---

## 📧 Email Notifications

### When Email is Sent
- ✉️ When test user validation **FAILS**
- ✉️ Lead ID is extracted and included
- ✉️ Sent to: `DEVELOPER_EMAIL` from .env

### Email Content
- IP Address of failed record
- Lead ID for investigation
- Detailed mismatch information
- Screenshot attachment (if configured)

---

## 🐛 Common Issues & Quick Fixes

### Browser Won't Launch
```
✗ Problem: Browser launch fails
✓ Fix: Ensure Chrome is installed
✓ Fix: Try headless mode (remove --headed)
```

### Navigation Fails
```
✗ Problem: Can't reach Cake or navigate to Conversions
✓ Fix: Check internet connection
✓ Fix: Verify Cake login credentials
✓ Fix: Check authentication state file exists
```

### Email Not Sending
```
✗ Problem: No email notification received
✓ Fix: Verify EMAIL_USER and EMAIL_PASS in .env
✓ Fix: Use Gmail App Password (not account password)
✓ Fix: Check spam folder for email
```

### Filter Not Applied
```
✗ Problem: Test Only filter shows no effect
✓ Fix: Verify filter element exists on Cake UI
✓ Fix: Check browser console for JavaScript errors
✓ Fix: May need to update CSS selectors if Cake UI changed
```

---

## 📊 Log File Interpretation

### Log Format
```
[TIMESTAMP] [LEVEL] Message
[2026-05-27T11:03:59.286Z] [INFO] Starting process
[2026-05-27T11:04:02.100Z] [ERROR] Validation failed
```

### Log Levels
- `[INFO]` - Informational, process is working
- `[WARN]` - Warning, something unexpected but not critical
- `[ERROR]` - Error, validation failed or extraction issue
- `[FATAL]` - Fatal, process cannot continue

### Read Logs For
- ✓ Understand what happened during execution
- ✓ Troubleshoot failures
- ✓ Verify filter was applied
- ✓ Check validation results

---

## 📈 Performance Tips

| Task | Speed | Tips |
|------|-------|------|
| **Headless Mode** | Fast ⚡ | Remove `--headed` flag |
| **Headed Mode** | Slower | Use for debugging/monitoring |
| **Multiple Runs** | Slow first, fast after | Auth state is cached |

---

## 🔒 Safety Checklist

- ✅ Original `cake.js` is **NEVER modified**
- ✅ Test Only script is **COMPLETELY INDEPENDENT**
- ✅ Different output directories (no conflicts)
- ✅ Each process has its own browser instance
- ✅ Both can run independently without interference
- ✅ Shared utilities are read-only functions

---

## 📞 Debugging Steps

1. **Check Log File**
   ```
   Open: CakeProcess.js/test_only_reports/execution_[timestamp].log
   Read from top to bottom for errors
   ```

2. **Check Screenshots**
   ```
   View: CakeProcess.js/test_only_screenshots/
   01_ = Filter applied (verify filter visible)
   02_ = Record opened (verify data visible)
   03_ = Failure (if validation failed)
   ```

3. **Check Report**
   ```
   Open: CakeProcess.js/test_only_reports/test_only_report_[timestamp].json
   Look for: summary.failed count
   Look for: failedLeadIds list
   ```

4. **Check Email**
   ```
   Verify email received at: DEVELOPER_EMAIL
   Check spam/junk folder
   Verify GMAIL app password is correct
   ```

---

## 🚀 Next Steps

### To Deploy Test Only Validation
1. ✅ Ensure Node.js installed
2. ✅ Verify .env file configured
3. ✅ Run `run_test_only_validation.bat`
4. ✅ Check `test_only_reports/` for results
5. ✅ Setup scheduler if automation needed

### To Schedule Regular Execution
1. Open Task Scheduler (Windows)
2. Create new task
3. Set trigger (daily/hourly)
4. Set action: Run `run_test_only_validation.bat`
5. Save and enable

---

## 📚 Documentation Files

| File | Purpose |
|------|---------|
| `TEST_ONLY_VALIDATION_README.md` | Comprehensive guide |
| `IMPLEMENTATION_SUMMARY.md` | Architecture & design decisions |
| `quick-reference.md` | This file - quick lookups |

---

## 💡 Tips & Tricks

### View Latest Report
```bash
# Open latest JSON report
cd CakeProcess.js\test_only_reports
dir /od test_only_report_*.json
```

### View Latest Log
```bash
# Open latest execution log
cd CakeProcess.js\test_only_reports
dir /od execution_*.log
```

### Clean Old Reports
```bash
# Remove reports older than X days
cd CakeProcess.js\test_only_reports
del /S test_only_report_*.json    (careful!)
```

---

## ✨ That's It!

You now have:
- ✅ **Independent Test Only validation script**
- ✅ **Separate from existing Cake process**
- ✅ **Comprehensive logging and reporting**
- ✅ **Automated email notifications**
- ✅ **Complete documentation**
- ✅ **Ready for production use**

**Happy testing!** 🎉

---

Last Updated: 2026-05-27
