# FLM Agent – Cake Verification Process

## Overview
The FLM Agent Verification Process automates the validation of test user records in the Cake CRM system. It intelligently verifies Test Only conversion records, validates IP consistency, and automatically notifies developers of any mismatches.

## Features

### ✅ Automated Verification
- **Date Range Management**: Automatically sets date range based on scheduler execution window
- **Test Only Filter**: Applies "Test Only" filter to isolate test conversions
- **IP Address Extraction**: Uses keyboard search to find and extract IP addresses from conversion records
- **IP Consistency Check**: Validates IP count and detects anomalies

### 🔍 Record Validation
- **Unique ID Lookup**: Opens and inspects detailed Unique ID records for each IP
- **Test User Verification**: Extracts and validates against expected test user information:
  - First Name: `CKMTESTPIXEL`
  - Last Name: `CKMTESTPIXEL`
  - Email: `ckmtestpixel@gmail.com`

### 📊 Reporting & Notifications
- **Automatic Logging**: Creates detailed JSON reports of all validation results
- **Screenshot Capture**: Captures screenshots of failed validations
- **Email Notifications**: Automatically notifies developers of failures with:
  - Failed Lead IDs
  - Detailed mismatch information
  - Execution summary

## Installation & Usage

### Prerequisites
- Node.js installed
- Playwright dependencies
- Valid Cake CRM credentials (stored in .env)
- Email configuration in .env for notifications

### Running the Verification

**Option 1: Using Batch File (Recommended)**
```bash
run_flm_verification.bat
```

**Option 2: Command Line**
```bash
node CakeProcess.js/cake_verification.js --headed
```

### Command Line Arguments
- `--headed`: Run browser in visible mode (recommended for monitoring)
- Without `--headed`: Runs in headless mode (faster, no visual feedback)

## Verification Process Flow

```
1. Launch Browser & Authenticate
   ↓
2. Navigate to Cake Reports → Conversions
   ↓
3. Set Date Range (automatic from scheduler)
   ↓
4. Apply "Test Only" Filter
   ↓
5. Extract IP Addresses from Conversion Grid
   ↓
6. For Each IP Address:
   ├─ Open Unique ID Record
   ├─ Extract Test User Details
   ├─ Validate Against Expected Values
   └─ Capture Screenshots on Mismatch
   ↓
7. Extract Failed Lead IDs
   ↓
8. Generate Report & Send Email
   ↓
9. Close Browser
```

## Output Files

### Generated in `CakeProcess.js/` directory:

1. **verification_report_[timestamp].json**
   - Complete validation results
   - Pass/fail statistics
   - Detailed mismatch information
   - Extracted data for each record

2. **verification_screenshots/** folder
   - `after_filter_applied.png` - Screenshot after filters
   - `failure_ip_[IP]_leadid_[ID].png` - Failure screenshots with IP and Lead ID

### Email Notifications
Sent to: `urvish.patel@bytestechnolab.com` (configurable via `DEVELOPER_EMAIL` env var)

**Email Content:**
- Execution timestamp
- Date range processed
- Failed Lead IDs list
- Detailed mismatch data
- Investigation guidance

## Configuration

### Environment Variables (.env)
```env
# Email Configuration
EMAIL_USER=your_email@gmail.com
EMAIL_PASS=your_app_password
DEVELOPER_EMAIL=developer@company.com

# Cake CRM Credentials
CAKE_USERNAME=your_username
CAKE_PASSWORD=your_password
```

## Validation Rules

### ✓ Pass Conditions
- All test user fields match exactly:
  - First Name = `CKMTESTPIXEL`
  - Last Name = `CKMTESTPIXEL`
  - Email = `ckmtestpixel@gmail.com`

### ✗ Fail Conditions
Any of the following triggers a failure:
- Field value doesn't match exactly
- Multiple different IP addresses (requires investigation)
- Record details cannot be extracted
- Lead ID mismatch or missing

## Report Format

```json
{
  "timestamp": "2026-05-26T16:49:51.819+05:30",
  "dateRange": {
    "startDate": "2026-05-25",
    "endDate": "2026-05-26"
  },
  "totalTests": 5,
  "passedTests": 4,
  "failedTests": 1,
  "mismatches": [
    {
      "ip": "192.168.1.100",
      "leadId": "12345",
      "mismatches": [
        {
          "field": "firstName",
          "expected": "CKMTESTPIXEL",
          "extracted": "TestUser123"
        }
      ]
    }
  ],
  "details": [...]
}
```

## Troubleshooting

### Common Issues

**1. Browser Won't Launch**
- Ensure Chrome/Chromium is installed
- Try running without `--headed` flag
- Check system resources

**2. Login Required**
- Ensure `cake-auth-state.json` exists and is valid
- May need to manually log in first
- Run with `--manual-login` flag if available

**3. Filter Not Applied**
- Verify element selectors match current Cake UI
- Check browser console for errors
- May need UI selector updates

**4. Email Not Sending**
- Verify EMAIL_USER and EMAIL_PASS in .env
- Check Gmail app-specific password settings
- Verify DEVELOPER_EMAIL is correct

### Debug Mode
To add verbose logging, modify the script to include:
```javascript
page.on('console', msg => console.log('PAGE LOG:', msg.text()));
```

## Advanced Usage

### Custom Date Range
Modify the `SCHEDULER_DATE_RANGE` function in `cake_verification.js`:
```javascript
function getSchedulerDateRange() {
  // Return custom date range object
  return { startDate: '2026-05-20', endDate: '2026-05-26' };
}
```

### Custom Test User Info
Update the `TEST_USER_INFO` constant:
```javascript
const TEST_USER_INFO = {
  firstName: 'CustomFirst',
  lastName: 'CustomLast',
  email: 'custom@example.com'
};
```

## Performance Notes
- Typical execution time: 5-10 minutes (depending on number of records)
- Higher with screenshots and email notifications
- Headless mode is faster than headed mode

## Support
For issues or improvements, contact the development team.

## Version History
- v1.0.0 - Initial FLM Agent Verification Process
- Features: IP validation, test user verification, automated notifications
