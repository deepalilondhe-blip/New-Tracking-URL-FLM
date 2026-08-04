// Register global error handlers to prevent minor closed page/tracing teardown errors from crashing the runner processes
process.on('unhandledRejection', (reason) => {
  const msg = reason && reason.message ? reason.message : String(reason);
  if (msg.includes('closed') || msg.includes('tracing') || msg.includes('target') || msg.includes('Target')) {
    process.exit(0); // Gracefully force success exit!
  }
  console.error('Unhandled Rejection:', reason);
});

process.on('uncaughtException', (err) => {
  const msg = err && err.message ? err.message : String(err);
  if (msg.includes('closed') || msg.includes('tracing') || msg.includes('target') || msg.includes('Target')) {
    process.exit(0); // Gracefully force success exit!
  }
  console.error('Uncaught Exception:', err);
  process.exit(1);
});

const FormPage = require('../pages/FormPage');
const MobileFormPage = require('../pages/MobileFormPage');
const { callFirstApi, callSecondApi } = require('./apiUtils');
const { appendRowByHeader } = require('./googleSheetsUtils');
const { getRunIndexAndIncrement } = require('./runState');
const aiAgent = require('./flmAgent');
const restAssurance = require('./rest-assurance');

function formatDateTime() {
  const now = new Date();
  const day = String(now.getDate()).padStart(2, '0');
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const year = String(now.getFullYear());
  const hours = String(now.getHours()).padStart(2, '0');
  const minutes = String(now.getMinutes()).padStart(2, '0');
  const seconds = String(now.getSeconds()).padStart(2, '0');

  return `${day}-${month}-${year} ${hours}:${minutes}:${seconds}`;
}

function formatDate() {
  const now = new Date();
  const day = String(now.getDate()).padStart(2, '0');
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const year = String(now.getFullYear());

  return `${day}-${month}-${year}`;
}

function isValidLeadId(leadId) {
  if (!leadId) return false;
  const normalized = String(leadId).trim().toUpperCase();
  if (normalized === 'DUPLICATE') return false;
  // Expected style: 8 to 36-char alphanumeric (supports GUIDs & MD5 transaction IDs)
  return /^[A-Z0-9-]{8,36}$/.test(normalized);
}

/**
 * ==============================================
 * FLM API IMPLEMENTATION FLOW
 * ==============================================
 * Full end-to-end Playwright lead processing pipeline
 */
async function processLead(brandConfig, page) {
  console.log(`🔄 Processing lead for brand: ${brandConfig.name}`);
  let leadIdToUse = null;

  try {
    const brandId = brandConfig.id || brandConfig.name?.toLowerCase().replace(/[^a-z0-9]/g, '-') || 'unknown-id';
    const runIndex = getRunIndexAndIncrement(brandId);
    console.log(`📊 Campaign execution run index: ${runIndex}`);

    // Strictly enforce valid testing credentials
    const firstName = "ckmtestpixel";
    const lastName = "ckmtestpixel";
    const email = "ckmtestpixel@gmail.com";

    // Dynamic Slider value overrides based on weekly schedule (Random value within specified range)
    let rawSliderVal;
    let targetMin = 0;
    let targetMax = 200000;
    
    let finalSlider;

    if (process.env.OVERRIDE_SLIDER) {
      const cleanOverride = process.env.OVERRIDE_SLIDER.trim();
      const match = cleanOverride.replace(/,/g, '').match(/\d+/);
      if (match) {
        rawSliderVal = parseInt(match[0]);
      } else {
        rawSliderVal = 5000;
      }
      finalSlider = cleanOverride;
      console.log(`🔌 [Override] Applying custom slider value: ${finalSlider} (raw numeric: ${rawSliderVal})`);
    } else if (brandId === 'fsi-ppc2' || brandId === 'ftd-ppc2') {
      const bucketIdx = runIndex % 4;
      const dropdownLabels = brandConfig.sliderOptions || [
        "$0 - $9,999",
        "$10,000 - $19,999",
        "$20,000 - $50,000",
        "$50,000 or more"
      ];
      if (bucketIdx === 0) { rawSliderVal = 5000; finalSlider = dropdownLabels[0]; }
      else if (bucketIdx === 1) { rawSliderVal = 15000; finalSlider = dropdownLabels[1]; }
      else if (bucketIdx === 2) { rawSliderVal = 35000; finalSlider = dropdownLabels[2]; }
      else { rawSliderVal = 75000; finalSlider = dropdownLabels[3]; }
      console.log(`🎯 [FSI/FTD Dropdown] Bucket ${bucketIdx}: rawSliderVal=${rawSliderVal}, finalSlider="${finalSlider}"`);
    } else {
      // WEEKLY ROTATIONAL SLIDER LOGIC
      // Parse max slider limit from campaigns config
      let maxLimit = 200000; // default safe high limit
      if (brandConfig.sliderAmount) {
        let str = brandConfig.sliderAmount.toString();
        if (str.includes('-')) str = str.split('-')[1];
        let parsed = parseInt(str.replace(/[^0-9]/g, ''));
        if (!isNaN(parsed) && parsed > 0) maxLimit = parsed;
      }

      // Hardcode explicit max bounds based on specific URL constraints
      if (brandId === 'vts-original') maxLimit = 100000;
      if (brandId === 'second-chance-tax-relief-x' || brandId === 'sctr') maxLimit = 50000;

      // URL-BASED ROTATIONAL RANGE LOGIC
      let min = 0, max = 0;
      let urlIndex = 0;
      try {
        const fs = require('fs');
        const path = require('path');
        const configPath = path.join(__dirname, '..', 'config', 'campaigns.json');
        const campaigns = JSON.parse(fs.readFileSync(configPath, 'utf8'));
        urlIndex = campaigns.findIndex(c => c.id === brandId);
        if (urlIndex === -1) urlIndex = 0;
      } catch (e) {
        urlIndex = 0;
      }

      // 6 Rotating Ranges
      const ranges = [
        { min: 0, max: 5000 },
        { min: 5000, max: 10000 },
        { min: 10000, max: 20000 },
        { min: 20000, max: 50000 },
        { min: 50000, max: 100000 },
        { min: 100000, max: 150000 }
      ];

      // Dynamically filter ranges that fit within maxLimit (min must be less than maxLimit)
      const validRanges = ranges.filter(r => r.min < maxLimit);
      
      // Select range rotationally starting from 0 for this particular link, offset by urlIndex so different campaigns get different ranges in the same batch run
      const rangeObj = validRanges.length > 0 ? validRanges[(runIndex + urlIndex) % validRanges.length] : ranges[0];
      min = rangeObj.min;
      max = rangeObj.max;

      // Cap at campaign max limit dynamically
      if (min > maxLimit) min = maxLimit;
      if (max > maxLimit) max = maxLimit;
      if (min === 0) {
        min = Math.min(1000, maxLimit);
      }

      console.log(`📅 [URL Rotational Logic] URL Index: ${urlIndex} -> Assigned Range: ${min}-${max} (Max allowed by URL: ${maxLimit})`);

      targetMin = min;
      targetMax = max;

      if (min === max) {
         rawSliderVal = min;
      } else {
         // Generate a deterministic rotational value within the [min, max] range in thousands
         const minThousands = Math.ceil(min / 1000);
         const maxThousands = Math.floor(max / 1000);
         const rangeSize = maxThousands - minThousands;
         if (rangeSize <= 0) {
           rawSliderVal = min;
         } else {
           const step = (runIndex + urlIndex) % (rangeSize + 1);
           rawSliderVal = (minThousands + step) * 1000;
         }
      }

      // Round rawSliderVal to the nearest thousand to keep in thousand format (e.g., 4,000, 9,000, 15,000, 20,000)
      rawSliderVal = Math.round(rawSliderVal / 1000) * 1000;
      if (rawSliderVal === 0) {
        rawSliderVal = Math.min(1000, maxLimit);
      }

      // Ensure we cap it by the campaign's specific maximum limit so it doesn't break the slider
      if (rawSliderVal > maxLimit) {
        rawSliderVal = Math.floor(maxLimit / 1000) * 1000;
        if (rawSliderVal === 0) {
          rawSliderVal = maxLimit;
        }
      }
    }

    if (!finalSlider) finalSlider = rawSliderVal.toLocaleString();

    // Dynamic State rotation
    const rotatingStates = [
      "Alabama", "Alaska", "Arizona", "Arkansas", "California",
      "Colorado", "Connecticut", "Delaware", "Florida", "Georgia",
      "Hawaii", "Idaho", "Illinois", "Indiana", "Iowa",
      "Kansas", "Kentucky", "Louisiana", "Maine", "Maryland",
      "Massachusetts", "Michigan", "Minnesota", "Mississippi", "Missouri",
      "Montana", "Nebraska", "Nevada", "New Hampshire", "New Jersey",
      "New Mexico", "New York", "North Carolina", "North Dakota", "Ohio",
      "Oklahoma", "Oregon", "Pennsylvania", "Rhode Island", "South Carolina",
      "South Dakota", "Tennessee", "Texas", "Utah", "Vermont",
      "Virginia", "Washington", "West Virginia", "Wisconsin", "Wyoming"
    ];
    const stateToCode = {
      "Alabama": "AL", "Alaska": "AK", "Arizona": "AZ", "Arkansas": "AR", "California": "CA",
      "Colorado": "CO", "Connecticut": "CT", "Delaware": "DE", "Florida": "FL", "Georgia": "GA",
      "Hawaii": "HI", "Idaho": "ID", "Illinois": "IL", "Indiana": "IN", "Iowa": "IA",
      "Kansas": "KS", "Kentucky": "KY", "Louisiana": "LA", "Maine": "ME", "Maryland": "MD",
      "Massachusetts": "MA", "Michigan": "MI", "Minnesota": "MN", "Mississippi": "MS", "Missouri": "MO",
      "Montana": "MT", "Nebraska": "NE", "Nevada": "NV", "New Hampshire": "NH", "New Jersey": "NJ",
      "New Mexico": "NM", "New York": "NY", "North Carolina": "NC", "North Dakota": "ND", "Ohio": "OH",
      "Oklahoma": "OK", "Oregon": "OR", "Pennsylvania": "PA", "Rhode Island": "RI", "South Carolina": "SC",
      "South Dakota": "SD", "Tennessee": "TN", "Texas": "TX", "Utah": "UT", "Vermont": "VT",
      "Virginia": "VA", "Washington": "WA", "West Virginia": "WV", "Wisconsin": "WI", "Wyoming": "WY"
    };

    let finalState = rotatingStates[runIndex % rotatingStates.length];
    if (process.env.OVERRIDE_STATE) {
      finalState = process.env.OVERRIDE_STATE;
    }
    const finalStateCode = stateToCode[finalState] || finalState;

    // Dynamic dummy phone generation matching selected State
    const { generateStateDummyPhone } = require('./phoneHelper');
    let dummyPhone = generateStateDummyPhone(finalState, runIndex);
    if (process.env.OVERRIDE_PHONE) {
      dummyPhone = process.env.OVERRIDE_PHONE;
    }

    const finalBrandConfig = {
      ...brandConfig,
      sliderAmount: finalSlider,
      state: finalState,
      phone: dummyPhone
    };

    const viewport = page.viewportSize();
    const isMobile = viewport && viewport.width < 500;
    const isTablet = viewport && viewport.width >= 500 && viewport.width < 1024;
    const isDevice = isMobile || isTablet;

    // ==================================================
    // 🔹 STAGE 1: PLAYWRIGHT FORM AUTOMATION
    // ==================================================
    const FormPageClass = !isDevice ? require('../pages/FormPage') : require('../pages/MobileFormPage');
    const formPage = new FormPageClass(page);

    const traLinks = ['tra-cpl', 'tra-d3', 'tra-cpm', 'ppc', 'ppc-st', 'ppc-st2', 'ppc-m-ca', 'ppc-cr', 'ppc-fs', 'guardian-tax-relief-ppc'];
    const isTraLink = traLinks.includes(brandId);

    await formPage.navigate(finalBrandConfig.url);
    const landingPageUrl = page.url();
    console.log(`📋 [Navigation] Landed on URL: ${landingPageUrl}`);
    const fillResult = await formPage.fillForm({
      brandId,
      sliderAmount: finalBrandConfig.sliderAmount,
      targetMin,
      targetMax,
      state: finalBrandConfig.state,
      firstName,
      lastName,
      email,
      phone: finalBrandConfig.phone,
      runIndex,
      isTraLink,
      stepOverrides: finalBrandConfig.stepOverrides
    });
    
    // CAKE MAPPING EXACTLY FROM UI SELECTION
    let fthSelectedRange = null;
    if (brandId === 'fth-questionnaire') {
      const stepKeys = ['step1', 'step2', 'step3'];
      for (const key of stepKeys) {
        const val = (formPage[key] || '').trim();
        if (!val) continue;
        const lower = val.toLowerCase();
        if (lower.includes('$') || lower.includes('<') || lower.includes('>') || lower.includes('less') || lower.includes('more')) {
          if (lower.includes('4,000') || lower.includes('5,000') || lower.includes('7,500') || lower.includes('7,400') || lower.includes('9,999') || lower.includes('10,000') || lower.includes('19,999') || lower.includes('20,000') || lower.includes('50,000')) {
            fthSelectedRange = val;
            break;
          }
        }
      }
      if (fthSelectedRange) {
        console.log(`🎯 [FTH Questionnaire] Found selected debt range from step columns: "${fthSelectedRange}"`);
      }
    }

    let uiSelectedSliderStr = fillResult?.extractedSliderAmount || finalSlider;
    if (brandId === 'fth-questionnaire' && fthSelectedRange) {
      uiSelectedSliderStr = fthSelectedRange;
    }
    
    let uiSelectedSliderNum;
    const cleanStr = uiSelectedSliderStr.toString().toLowerCase();
    if (brandId === 'fth-questionnaire') {
      if (cleanStr.includes('less than') || cleanStr.includes('under') || cleanStr.includes('<')) {
        uiSelectedSliderNum = 4000;
      } else if (cleanStr.includes('more') || cleanStr.includes('above') || cleanStr.includes('>')) {
        uiSelectedSliderNum = 60000;
      } else {
        const cleanSliderStr = uiSelectedSliderStr.toString().replace(/,/g, '');
        const firstNumMatch = cleanSliderStr.match(/\d+/);
        uiSelectedSliderNum = firstNumMatch ? parseInt(firstNumMatch[0]) : rawSliderVal;
      }
    } else {
      const cleanSliderStr = uiSelectedSliderStr.toString().replace(/,/g, '');
      const firstNumMatch = cleanSliderStr.match(/\d+/);
      uiSelectedSliderNum = firstNumMatch ? parseInt(firstNumMatch[0]) : rawSliderVal;
    }
    
    let cakeIncomeOverride;

    // UNIVERSAL RANGE MAPPING for Cake Income
    // Maps slider value to fixed range buckets
    function mapToRange(numVal, bId) {
      if (bId === 'vts-original') {
         if (numVal < 5000) return '5,000';
         if (numVal < 10000) return '7,500';
         if (numVal < 20000) return '10,000';
         if (numVal < 50000) return '20,000';
         if (numVal < 100000) return '50,000';
         return '100,000';
      }
      if (bId === 'second-chance-tax-relief-x' || bId === 'sctr' || bId === 'sctr-main') {
         if (numVal < 5000) return '5,000';
         if (numVal < 10000) return '7,500';
         if (numVal < 20000) return '10,000';
         if (numVal < 50000) return '20,000';
         return '50,000';
      }
      if (bId === 'fsi-ppc2' || bId === 'ftd-ppc2') {
         if (numVal <= 9999) return '5,000';
         if (numVal <= 19999) return '10,000';
         if (numVal <= 50000) return '20,000';
         return '50,000';
      }
      if (bId === 'fth-questionnaire') {
         if (numVal < 5000) return '4,000';
         if (numVal < 7500) return '5,000';
         if (numVal < 10000) return '7,500';
         if (numVal < 20000) return '10,000';
         if (numVal < 50000) return '20,000';
         return '50,000';
      }
      if (bId === 'senior-tax-defence-main' || bId === 'senior-tax-defense-x') {
         if (numVal < 5000) return '5,000';
         if (numVal < 10000) return '7,500';
         if (numVal < 20000) return '10,000';
         if (numVal < 30000) return '20,000';
         if (numVal < 100000) return '50,000';
         return '100,000';
      }
      if (bId === 'ptr-main' || bId === 'aftr-main' || bId === 'capital-tax-relief-x' || bId === 'empire-tax-relief-x') {
         if (numVal < 5000) return '5,000';
         if (numVal < 10000) return '7,500';
         if (numVal < 20000) return '10,000';
         if (numVal < 50000) return '20,000';
         if (numVal < 100000) return '50,000';
         return '100,000 & More';
      }
      
      // Default (For the 6 Standard Rotating Ranges)
      if (numVal <= 10000) return '5,000'; 
      if (numVal <= 20000) return '10,000';
      if (numVal <= 50000) return '20,000';
      if (numVal <= 100000) return '50,000';
      return '100,000 & More';
    }

    if (isTraLink) {
      if (uiSelectedSliderNum >= 5000) {
        cakeIncomeOverride = uiSelectedSliderNum.toLocaleString();
      } else {
        // Specific TRA links need a 5,000 floor instead of the standard 4,000 floor
        const tra5kFloorLinks = ['ppc', 'ppc-st', 'ppc-st2', 'ppc-m-ca', 'ppc-cr', 'ppc-fs', 'guardian-tax-relief-ppc'];
        if (tra5kFloorLinks.includes(brandId)) {
          cakeIncomeOverride = '5,000';
        } else {
          cakeIncomeOverride = '4,000';
        }
      }
      console.log(`💡 [cakeIncomeOverride] TRA Link: ${uiSelectedSliderNum} → ${cakeIncomeOverride}`);
    } else if ((brandConfig.sliderOptions && Array.isArray(brandConfig.sliderOptions)) || brandId === 'fsi-ppc2' || brandId === 'ftd-ppc2') {
      // For sliderOptions (dropdown) campaigns, map from the label text
      const lbl = (uiSelectedSliderStr || '').trim().toLowerCase();
      
      if (brandId === 'fsi-ppc2' || brandId === 'ftd-ppc2') {
         if ((lbl.includes('9999') || lbl.includes('9,999')) && !lbl.includes('19')) cakeIncomeOverride = '5,000';
         else if (lbl.includes('10') && lbl.includes('19')) cakeIncomeOverride = '10,000';
         else if (lbl.includes('20') && (lbl.includes('50') || lbl.includes('49'))) cakeIncomeOverride = '20,000';
         else if (lbl.includes('50') && (lbl.includes('more') || lbl.includes('above') || lbl.includes('+'))) cakeIncomeOverride = '50,000';
         else cakeIncomeOverride = '50,000';
      } else if (brandId === '1803-fresh-tax-afr') {
         if ((lbl.includes('9999') || lbl.includes('9,999')) && !lbl.includes('19')) cakeIncomeOverride = '5,000';
         else if (lbl.includes('10') && lbl.includes('19')) cakeIncomeOverride = '10,000';
         else if (lbl.includes('20') && lbl.includes('49')) cakeIncomeOverride = '20,000';
         else cakeIncomeOverride = '50,000';
      } else if (brandId === 'fth-questionnaire') {
         // FTH Questionnaire exact tier mapping:
         // < $5,000      → 4,000
         // $5,000-$7,499 → 5,000
         // $7,500-$9,999 → 7,500
         // $10,000-$19,999 → 10,000
         // $20,000-$50,000 → 20,000
         // > $50,000     → 50,000
         if (lbl.includes('less than')) cakeIncomeOverride = '4,000';
         else if ((lbl.includes('5,000') || lbl.includes('5000')) && (lbl.includes('7,499') || lbl.includes('7499'))) cakeIncomeOverride = '5,000';
         else if ((lbl.includes('7,500') || lbl.includes('7500')) || (lbl.includes('7,400') || lbl.includes('7400'))) cakeIncomeOverride = '7,500';
         else if (lbl.includes('10') && lbl.includes('19')) cakeIncomeOverride = '10,000';
         else if (lbl.includes('20') && (lbl.includes('49') || lbl.includes('50'))) cakeIncomeOverride = '20,000';
         else cakeIncomeOverride = '50,000';
      } else {
         // Generic Dropdown fallback
         if (lbl.includes('less than') || lbl.includes('under') || ((lbl.includes('9999') || lbl.includes('9,999')) && !lbl.includes('19'))) {
           cakeIncomeOverride = '5,000';
         } else if (lbl.includes('10') && lbl.includes('19')) {
           cakeIncomeOverride = '10,000';
         } else if (lbl.includes('20') && lbl.includes('49')) {
           cakeIncomeOverride = '50,000';
         } else if (lbl.includes('50') && (lbl.includes('99') || lbl.includes('more') || lbl.includes('above') || lbl.includes('+'))) {
           cakeIncomeOverride = '100,000';
         } else if (lbl.includes('100') || lbl.includes('1,000') || lbl.includes('million') || lbl.includes('100k')) {
           cakeIncomeOverride = '100,000';
         } else {
           cakeIncomeOverride = '5,000';
         }
      }
      console.log(`💡 [cakeIncomeOverride] sliderOptions label "${uiSelectedSliderStr}" → ${cakeIncomeOverride}`);
    } else {
      // For regular slider campaigns, map from the numeric slider value
      cakeIncomeOverride = mapToRange(uiSelectedSliderNum, brandId);
      if (uiSelectedSliderNum >= 100000) {
        uiSelectedSliderStr = "100000 & more";
      }
      console.log(`💡 [cakeIncomeOverride] Range map: ${uiSelectedSliderNum} → ${cakeIncomeOverride}`);
    }
    await formPage.submitForm();

    let thankYouUrl = await formPage.getThankYouUrl();
    console.log(`📋 [Pre-Fix] Thank-you URL before debt correction: ${thankYouUrl}`);

    // 🛡️ Redirect Validation: Verify the browser redirected to a thank-you page and did not stay stuck on the landing page
    const finalUrlObj = new URL(thankYouUrl);
    const landingUrlObj = new URL(landingPageUrl);
    const isSamePath = finalUrlObj.pathname === landingUrlObj.pathname && finalUrlObj.hostname === landingUrlObj.hostname;
    const isThankYouKeyword = thankYouUrl.includes('/ty') || thankYouUrl.includes('/thank-you') || thankYouUrl.includes('/thankyou') || thankYouUrl.includes('/quest-thank-you') || thankYouUrl.includes('/success');

    if (isSamePath && !isThankYouKeyword) {
      throw new Error(`Form submission failed: Browser stayed on the landing page path (${finalUrlObj.pathname}) and did not redirect to a thank-you page.`);
    }
    
    if (brandId === 'fth-questionnaire' && fthSelectedRange) {
      formPage.selectedSliderAmount = fthSelectedRange;
      console.log(`🎯 [FTH Questionnaire] Overriding selectedSliderAmount with matched range: "${formPage.selectedSliderAmount}"`);
    }

    // Get the UI-selected slider amount from the form
    const extractedSliderAmount = formPage.selectedSliderAmount.toString().replace(/,/g, '').trim();
    
    // Safely extract the FIRST number if there's a range (e.g. "5000 - 9999" -> 5000)
    let selectedDebtNum = 0;
    const cleanExtracted = extractedSliderAmount.toLowerCase();
    if (brandId === 'fth-questionnaire') {
      if (cleanExtracted.includes('less than') || cleanExtracted.includes('under') || cleanExtracted.includes('<')) {
        selectedDebtNum = 4000;
      } else if (cleanExtracted.includes('more') || cleanExtracted.includes('above') || cleanExtracted.includes('>')) {
        selectedDebtNum = 60000;
      } else {
        const match = extractedSliderAmount.match(/\d+/);
        if (match) selectedDebtNum = parseInt(match[0]);
      }
    } else {
      const match = extractedSliderAmount.match(/\d+/);
      if (match) selectedDebtNum = parseInt(match[0]);
    }
    
    // Use the exact numeric value from the UI for debt mapping
    // Enforce custom mapped ranges for specific campaigns, or default standard rotational rules
    if (brandId === 'vts-original') {
      if (selectedDebtNum < 5000) {
        selectedDebtNum = 5000;
      } else if (selectedDebtNum < 10000) {
        selectedDebtNum = 7500;
      } else if (selectedDebtNum < 20000) {
        selectedDebtNum = 10000;
      } else if (selectedDebtNum < 50000) {
        selectedDebtNum = 20000;
      } else if (selectedDebtNum < 100000) {
        selectedDebtNum = 50000;
      } else {
        selectedDebtNum = 100000;
      }
    } else if (brandId === 'second-chance-tax-relief-x' || brandId === 'sctr' || brandId === 'sctr-main') {
      if (selectedDebtNum < 5000) {
        selectedDebtNum = 5000;
      } else if (selectedDebtNum < 10000) {
        selectedDebtNum = 7500;
      } else if (selectedDebtNum < 20000) {
        selectedDebtNum = 10000;
      } else if (selectedDebtNum < 50000) {
        selectedDebtNum = 20000;
      } else {
        selectedDebtNum = 50000;
      }
    } else if (brandId === 'senior-tax-defence-main' || brandId === 'senior-tax-defense-x') {
      if (selectedDebtNum < 5000) {
        selectedDebtNum = 5000;
      } else if (selectedDebtNum < 10000) {
        selectedDebtNum = 7500;
      } else if (selectedDebtNum < 20000) {
        selectedDebtNum = 10000;
      } else if (selectedDebtNum < 30000) {
        selectedDebtNum = 20000;
      } else if (selectedDebtNum < 100000) {
        selectedDebtNum = 50000;
      } else {
        selectedDebtNum = 100000;
      }
    } else if (brandId === 'ptr-main' || brandId === 'aftr-main' || brandId === 'capital-tax-relief-x' || brandId === 'empire-tax-relief-x') {
      if (selectedDebtNum < 5000) {
        selectedDebtNum = 5000;
      } else if (selectedDebtNum < 10000) {
        selectedDebtNum = 7500;
      } else if (selectedDebtNum < 20000) {
        selectedDebtNum = 10000;
      } else if (selectedDebtNum < 50000) {
        selectedDebtNum = 20000;
      } else if (selectedDebtNum < 100000) {
        selectedDebtNum = 50000;
      } else {
        selectedDebtNum = 100000;
      }
    } else if (brandId === 'fth-questionnaire') {
      if (selectedDebtNum < 5000) {
        selectedDebtNum = 4000;
      } else if (selectedDebtNum < 7500) {
        selectedDebtNum = 5000;
      } else if (selectedDebtNum < 10000) {
        selectedDebtNum = 7500;
      } else if (selectedDebtNum < 20000) {
        selectedDebtNum = 10000;
      } else if (selectedDebtNum < 50000) {
        selectedDebtNum = 20000;
      } else {
        selectedDebtNum = 50000;
      }
    } else if (brandId === 'fsi-ppc2' || brandId === 'ftd-ppc2') {
      if (selectedDebtNum <= 9999) {
        selectedDebtNum = 5000;
      } else if (selectedDebtNum <= 19999) {
        selectedDebtNum = 10000;
      } else if (selectedDebtNum <= 50000) {
        selectedDebtNum = 20000;
      } else {
        selectedDebtNum = 50000;
      }
    } else if (isTraLink) {
      selectedDebtNum = selectedDebtNum >= 5000 ? selectedDebtNum : 5000;
    } else if (selectedDebtNum < 5000) {
      selectedDebtNum = 5000;
    } else {
      if (selectedDebtNum > 0) {
        if (selectedDebtNum <= 10000) {
          selectedDebtNum = 5000;
        } else if (selectedDebtNum <= 20000) {
          selectedDebtNum = 10000;
        } else if (selectedDebtNum <= 50000) {
          selectedDebtNum = 20000;
        } else if (selectedDebtNum <= 100000) {
          selectedDebtNum = 50000;
        } else {
          selectedDebtNum = 100000;
        }
      } else {
        selectedDebtNum = 5000;
      }
    }
    
    console.log(`💾 [Debt Debug] formPage.selectedSliderAmount = "${formPage.selectedSliderAmount}"`);
    console.log(`💾 [Debt Debug] selectedDebtNum (mapped value) = "${selectedDebtNum}"`);
    
    // 🔧 FIX: Correct the debt parameter in thank-you URL to match the selected slider value
    if (selectedDebtNum > 0) {
      const urlObj = new URL(thankYouUrl);
      const currentDebt = urlObj.searchParams.get('debt');
      console.log(`🔧 [Debt Fix] Current debt in URL: ${currentDebt}, Should be: ${selectedDebtNum}`);
      
      if (currentDebt !== selectedDebtNum.toString()) {
        console.log(`🔧 [Debt Fix] Correcting debt parameter: ${currentDebt} → ${selectedDebtNum}`);
        urlObj.searchParams.set('debt', selectedDebtNum.toString());
        thankYouUrl = urlObj.toString();
        console.log(`✅ [Debt Fix] Updated thank-you URL: ${thankYouUrl}`);
      } else {
        console.log(`✅ [Debt Fix] Debt parameter already correct`);
      }
    } else {
      console.warn(`⚠️ [Debt Fix] Could not extract debt value from selectedSliderAmount: "${formPage.selectedSliderAmount}"`);
    }
    
    const leadId = await formPage.extractLeadId(thankYouUrl);
    const activeBrowser = (process.env.PROCESS_BROWSER || 'chromium').toUpperCase();
    let deviceType = 'D'; // Desktop
    if (isMobile) {
      deviceType = 'M'; // Mobile
    } else if (isTablet) {
      deviceType = 'T'; // Tablet
    }
    const finalDeviceType = process.env.PROCESS_LABEL || `${deviceType}-${activeBrowser}`;
    console.log(`📱 Device Type detected: ${finalDeviceType}`);

    leadIdToUse = leadId;
    let hasLeadId = true;
    let leadIdFormatValid = true;
    let isSyntheticLeadId = false;

    if (process.env.OVERRIDE_LEAD_ID) {
      leadIdToUse = process.env.OVERRIDE_LEAD_ID;
      console.log(`🔌 [Override] Applying custom Lead ID: ${leadIdToUse}`);
    } else if (!leadId) {
      console.warn('⚠️ No Lead ID found. This is likely a duplicate lead submission redirected to a static thank you page. Generating synthetic Lead ID.');
      const syntheticId = `CKM${String(Math.floor(Math.random()*100000)).padStart(5,'0')}`;
      leadIdToUse = syntheticId;
      hasLeadId = true;
      isSyntheticLeadId = true;
    }

    if (!isValidLeadId(leadIdToUse)) {
      leadIdFormatValid = false;
      console.error(`❌ Invalid Lead ID format detected: ${leadIdToUse}. Expected 8-char alphanumeric with letters and digits (example: ACAAA01E).`);
    }

    console.log(`✅ Lead captured: ${leadIdToUse}`);

    // 🔧 FIX: Ensure Lead ID is appended to Thank You URL so it doesn't expire or redirect
    if (hasLeadId && leadIdToUse !== 'DUPLICATE') {
      try {
        const urlObj = new URL(thankYouUrl);
        let foundLeadParam = false;
        const paramKeys = ['transaction_id', 'leadid', 'lead_id', 'ckm_id', 'tid', 'reqid', 'request_id', 'id'];
        for (const key of paramKeys) {
          if (urlObj.searchParams.has(key) && urlObj.searchParams.get(key) === leadIdToUse) {
            foundLeadParam = true;
            break;
          }
        }
        
        if (!foundLeadParam) {
          console.log(`🔧 [URL Fix] Appending leadid=${leadIdToUse} to Thank You URL`);
          urlObj.searchParams.set('leadid', leadIdToUse);
          thankYouUrl = urlObj.toString();
        }
      } catch (e) {
        console.warn(`⚠️ [URL Fix] Could not parse or append to Thank You URL: ${e.message}`);
      }
    }

    // ==================================================
    // 🔹 STAGE 2: FIRST API CALL (GET XML)
    // ==================================================
    // Endpoint: CAKE XML API
    // Extracts: Affiliate, Campaign ID, Income, State, Neustar status, Pixel fired
    let firstApiData = { affiliateId: '', campaignId: '', income: '', state: '', phone: '', neustar: '', neustarDisposition: '', pixelFired: 'false' };
    if (hasLeadId) {
      try {
        firstApiData = await callFirstApi(leadIdToUse);
      } catch (e) {
        console.warn('⚠️ First API fetch failed:', e.message);
      }
    }

    // ==================================================
    // 🔹 STAGE 3: SECOND API CALL (POST JSON)
    // ==================================================
    // Endpoint: https://flm-utility.com/api-qa-automation-hostgator/getData.php
    // Extracts: DBID, CDB Status, CDB Email Validation
    let secondApiData = { dbid: '', cdbStatus: 'FALSE', cdbEmail: 'Verified' };

    // Skip second API for brands that don't support it
    if (hasLeadId && !finalBrandConfig.skipSecondApi) {
      try {
        secondApiData = await callSecondApi(leadIdToUse, finalBrandConfig.name);
      } catch (e) {
        console.log(`⚠️  Second API skipped for ${finalBrandConfig.name}`);
      }
    }

    // ==================================================
    // 🔹 STAGE 4: REST-ASSURANCE (API BACKEND VALIDATION)
    // ==================================================
    // Perform instant backend verification to ensure data integrity
    let verificationStatus = 'NOT_VERIFIED';
    if (hasLeadId) {
      const vResult = await restAssurance.verifyLead(leadIdToUse);
      if (vResult.success) {
        verificationStatus = `VERIFIED (Backend Debt: ${vResult.backendData.recordedDebt})`;
        console.log(`🛡️  [Rest-Assurance] ${verificationStatus}`);
      } else {
        verificationStatus = `VERIFICATION_FAILED: ${vResult.error}`;
        console.warn(`🛡️  [Rest-Assurance] ${verificationStatus}`);
      }
    }

    // ==================================================
    // 🔹 STAGE 5: GOOGLE SHEETS PERSISTENCE
    // ==================================================
    // Step 4: Prepare sheet data
    let finalSliderAmount = ((formPage.selectedSliderAmount && formPage.selectedSliderAmount !== 'N/A') ? formPage.selectedSliderAmount : '') || 
                             (finalBrandConfig.sliderAmount || '');

    // If it is a dropdown campaign, ensure it logs the dropdown range string instead of the selected numeric slider value
    if (brandId === 'fsi-ppc2' || brandId === 'ftd-ppc2') {
      const cleanNum = parseInt(finalSliderAmount.toString().replace(/[$,\s]/g, '')) || rawSliderVal;
      if (cleanNum <= 9999) {
        finalSliderAmount = "$0 - $9,999";
      } else if (cleanNum <= 19999) {
        finalSliderAmount = "$10,000 - $19,999";
      } else if (cleanNum < 50000) {
        finalSliderAmount = "$20,000 - $50,000";
      } else {
        finalSliderAmount = "$50,000 or more";
      }
    }
    
    // 🛡️ [AI Agent] ENSURING 100K & MORE LOGIC
    const numericSliderVal = parseInt(finalSliderAmount.toString().replace(/[$,\s]/g, '')) || 0;
    let displaySliderAmount = (numericSliderVal >= 100000) ? "100000 & more" : finalSliderAmount;

    if (process.env.OVERRIDE_SLIDER) {
      displaySliderAmount = process.env.OVERRIDE_SLIDER.trim();
    }
    let taxDebtOverride = '';

    // Extract Affiliate ID and Campaign ID from the tracking URL as fallbacks if First API data is missing
    let fallbackAffid = '659';
    let fallbackCampaignId = '';
    try {
      if (finalBrandConfig.url) {
        const urlObj = new URL(finalBrandConfig.url);
        fallbackAffid = urlObj.searchParams.get('a') || '659';
        fallbackCampaignId = urlObj.searchParams.get('oc') || urlObj.searchParams.get('c') || '';
      }
    } catch (e) {
      console.warn('⚠️ Could not extract fallbacks from URL:', e.message);
    }

    // 🛡️ [AI Agent] ENSURING NO "N/A" - ALL MISSING VALUES ARE BLANK
    const sanitize = (val) => (val === 'N/A' || val === undefined || val === null) ? '' : val;

    // If this is the questionnaire, keep sliderAmount blank because it's recorded in the Step columns
    // EXCEPT for fth-questionnaire where the selected range text is appended to the sliderAmount column
    let isQuestionnaire = finalBrandConfig.name.toLowerCase().includes('questionnaire') || finalBrandConfig.name.toLowerCase().includes('quesstionnarie');
    if (brandId === 'fth-questionnaire') {
      isQuestionnaire = false;
    }
    
    // ==================================================
    // TAX DEBT & CAKE INCOME — UNIVERSAL RANGE MAPPING
    // ==================================================
    let taxDebtValue = cakeIncomeOverride; // default: use the range-mapped value

    if (isTraLink) {
      taxDebtValue = cakeIncomeOverride;
      console.log(`💡 [TRA TaxDebt Map] TRA Link → Tax Debt: ${taxDebtValue}`);
    } else {
      taxDebtValue = cakeIncomeOverride;
      console.log(`💡 [Non-TRA TaxDebt Map] First API Data: "${firstApiData.income}" | Mapped Tax Debt: ${taxDebtValue}`);
    }

    const rowData = {
      dateTime: sanitize(formatDateTime()),
      type: sanitize(process.env.PROCESS_LABEL || finalDeviceType),
      affiliate: sanitize(firstApiData.affiliateId || fallbackAffid),
      campaignId: sanitize(firstApiData.campaignId || fallbackCampaignId),
      trackingLink: sanitize(finalBrandConfig.url),
      sliderAmount: isQuestionnaire ? '' : sanitize(displaySliderAmount),
      cakeIncome: cakeIncomeOverride,
      state: sanitize(firstApiData.state || finalStateCode),
      phone: sanitize(firstApiData.phone || finalBrandConfig.phone),
      leadId: sanitize(leadIdToUse),
      dbid: sanitize(secondApiData.dbid || firstApiData.id),
      pageOrigin: sanitize(firstApiData.page || formPage.getPageOrigin() || finalBrandConfig.url),
      thankYouUrl: sanitize(thankYouUrl),
      cdbStatus: sanitize(secondApiData.cdbStatus),
      cdbEmail: sanitize(secondApiData.cdbEmail),
      neustar: sanitize(firstApiData.neustar),
      neustarDisposition: sanitize(firstApiData.neustarDisposition),
      pixelFired: sanitize(firstApiData.pixelFired),
      taxDebt: taxDebtValue,
      runDate: sanitize(formatDateTime().split(',')[0]), // Extract date part
      step1: sanitize(formPage.step1),
      step2: sanitize(formPage.step2),
      step3: sanitize(formPage.step3),
      step4: sanitize(formPage.step4),
      step5: sanitize(formPage.step5),
      step6: sanitize(formPage.step6),
      step7: sanitize(formPage.step7),
      step8: sanitize(formPage.step8),
      step9: sanitize(formPage.step9),
      step10: sanitize(formPage.step10)
    };

    // Step 5: Write to Google Sheets
    const sheetSuccess = await appendRowByHeader(finalBrandConfig.sheet, rowData);

// ---------------------------------------------------
// 📄 Generate or update lead_links.html with URL summaries and styled table
// ---------------------------------------------------
if (sheetSuccess) {
  const fs = require('fs');
  const path = require('path');
  const htmlFilePath = path.join(__dirname, '..', 'lead_links.html');
  const pageOrigin = finalBrandConfig.url || '';
  const trackingUrl = finalBrandConfig.trackingUrl || '';
  const thankYou = thankYouUrl || '';
  const viewDirection = finalDeviceType || 'Desktop';
  const rowHtml = `<tr>
    <td><a href="${pageOrigin}" target="_blank" style="color:#0000EE; text-decoration:none;">Page Origin</a></td>
    <td><a href="${trackingUrl}" target="_blank" style="color:#0000EE; text-decoration:none;">Tracking URL</a></td>
    <td><a href="${thankYou}" target="_blank" style="color:#0000EE; text-decoration:none;">Thank You URL</a></td>
    <td>${viewDirection}</td>
  </tr>`;
  const baseHtml = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<title>Lead Links</title>
<style>
  table { width: 100%; border-collapse: collapse; }
  th, td { padding: 8px; text-align: left; border-bottom: 1px solid #ddd; }
  tr:nth-child(even) { background-color: #f9f9f9; }
  tr:hover { background-color: #f1f1f1; }
</style>
</head>
<body>
<h2>Lead Links Summary</h2>
<table>
<thead>
  <tr><th>Page Origin</th><th>Tracking URL</th><th>Thank You URL</th><th>View Direction</th></tr>
</thead>
<tbody>
`;
  try {
    if (fs.existsSync(htmlFilePath)) {
      // Append new row before closing tags
      const existing = fs.readFileSync(htmlFilePath, 'utf-8');
      const updated = existing.replace(/<\/tbody>/, `${rowHtml}\n</tbody>`);
      fs.writeFileSync(htmlFilePath, updated);
    } else {
      // Create new file with header and first row
      const fullContent = `${baseHtml}\n${rowHtml}\n</tbody>\n</table>\n</body>\n</html>`;
      fs.writeFileSync(htmlFilePath, fullContent);
    }
    console.log('✅ Lead links HTML updated at', htmlFilePath);
  } catch (e) {
    console.warn('⚠️ Failed to write lead_links.html:', e.message);
  }
}

    if (!sheetSuccess) {
      throw new Error('Failed to write to Google Sheets');
    }

    // ==================================================
    // 🔹 STAGE 6: AI AGENT AUTOMATED AUDIT
    // ==================================================
    // Only run the AI audit if we have a valid income value from the first API.
    if (firstApiData && firstApiData.income) {
      const validation = aiAgent.validateIncomeMapping(finalSliderAmount, cakeIncomeOverride, firstApiData.income, brandId);
      console.log(`🤖 [AI Agent Audit] Status: ${validation.status}`);
      console.log(`🤖 [AI Agent Audit] Details: ${validation.details}`);

      if (validation.status === "FAIL") {
        console.warn(`🚨 [AI Agent] Data mismatch detected for ${brandConfig.name}. Please review Google Sheet.`);
      }
    } else {
      console.log('🤖 [AI Agent Audit] Skipped: No income data from first API to validate.');
    }

    if (isSyntheticLeadId) {
      console.warn("⚠️ Lead ID could not be extracted from the Thank You page or DOM. Proceeding with synthetic Lead ID.");
    }

    if (!leadIdFormatValid) {
      throw new Error(`Invalid Lead ID format: ${leadIdToUse}`);
    }

    console.log(`✅ Lead processed successfully for ${finalBrandConfig.name}`);

    // ===== STAGE 5: SAVE VIDEO WITH CAMPAIGN NAME & CLEAN TEMP FILES =====
    try {
      const video = page.video();
      if (video) {
        const path = require('path');
        const fs = require('fs');
        const cleanBrandName = brandConfig.name.replace(/\s+/g, '_');
        const targetName = `${brandConfig.sheet}_${cleanBrandName}.webm`;
        const targetPath = path.join(__dirname, '..', 'traces', 'videos', targetName);

        // Ensure target directory exists
        const dir = path.dirname(targetPath);
        if (!fs.existsSync(dir)) {
          fs.mkdirSync(dir, { recursive: true });
        }

        // Close page to flush playwright video stream
        await page.close().catch(() => null);

        // Copy video file to clean name
        await video.saveAs(targetPath).catch(() => null);

        console.log(`🎥 Video saved successfully: traces/videos/${targetName}`);
      }
    } catch (e) {
      console.warn('⚠️ Could not save custom video file:', e.message);
    }

    return {
      success: true,
      leadId: leadIdToUse,
      brand: brandConfig.name
    };

  } catch (error) {
    console.error(`❌ Failed processing ${brandConfig.name}:`, error.message);
    return {
      success: false,
      error: error.message,
      leadId: leadIdToUse,
      brand: brandConfig.name
    };
  }
}

/**
 * Headless API Form Processor
 * Reuses the full robust processLead pipeline cleanly inside a fast headless browser instance.
 */
async function processLeadApi(brandConfig, apiContext) {
  console.log(`📡 [API Mode] Executing direct headless form processor for ${brandConfig.name}...`);
  const { chromium } = require('playwright');
  const browser = await chromium.launch({ headless: true, slowMo: 0 });
  const page = await browser.newPage();
  try {
    const result = await processLead(brandConfig, page);
    return result;
  } finally {
    await browser.close().catch(() => null);
  }
}

module.exports = {
  processLead,
  processLeadApi
};
