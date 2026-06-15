// testStaticData.js
// This script reads staticData.json and appends rows to the corresponding Google Sheet tabs
// using the existing googleSheetsUtils.appendRowByHeader function.
// It applies the slider-to-income mapping logic and ensures Tax Debt equals Cake Income.

const fs = require('fs');
const path = require('path');

// Import the sheet appending utility
const { appendRowByHeader } = require('./utils/googleSheetsUtils');

// Load static data
const staticDataPath = path.join(__dirname, 'static', 'staticData.json');
if (!fs.existsSync(staticDataPath)) {
  console.error('Static data file not found at', staticDataPath);
  process.exit(1);
}

const staticData = JSON.parse(fs.readFileSync(staticDataPath, 'utf8'));

/**
 * Compute the slider amount string based on the raw value.
 * For values less than 500, we use "Under $500".
 * Otherwise we keep the raw value (e.g., "15000" or "Over 50000").
 */
function computeSliderAmount(raw) {
  const numeric = parseInt(String(raw).replace(/[^0-9]/g, ''), 10);
  if (!isNaN(numeric) && numeric < 500) {
    return 'Under $500';
  }
  return String(raw);
}

(async () => {
  for (const entry of staticData.entries) {
    const sliderAmount = computeSliderAmount(entry.sliderValue);
    const cakeIncome = sliderAmount; // map directly for static test
    const taxDebt = cakeIncome; // ensure Tax Debt mirrors Cake Income
    const rowData = {
      dateTime: new Date().toISOString(),
      type: 'D',
      affiliate: 'StaticTest',
      campaignId: 'static',
      trackingLink: entry.url,
      sliderAmount,
      cakeIncome,
      state: entry.state || '',
      phone: entry.phone || '',
      leadId: '',
      dbid: '',
      pageOrigin: '',
      thankYouUrl: '',
      cdbStatus: '',
      cdbEmail: '',
      neustar: '',
      neustarDisposition: '',
      pixelFired: '',
      taxDebt,
      step1: '', step2: '', step3: '', step4: '', step5: '',
      step6: '', step7: '', step8: '', step9: '', step10: ''
    };

    console.log(`Appending to sheet "${entry.sheetName}" – Slider: ${sliderAmount}, Tax Debt: ${taxDebt}`);
    try {
      await appendRowByHeader(entry.sheetName, rowData);
      console.log('✅ Row appended successfully');
    } catch (err) {
      console.error('❌ Failed to append row:', err.message);
    }
  }
})();
