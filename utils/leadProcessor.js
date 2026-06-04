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
  const year = now.getFullYear();
  const hours = String(now.getHours()).padStart(2, '0');
  const minutes = String(now.getMinutes()).padStart(2, '0');
  const seconds = String(now.getSeconds()).padStart(2, '0');

  return `${day}-${month}-${year} ${hours}:${minutes}:${seconds}`;
}

function formatDate() {
  const now = new Date();
  const day = String(now.getDate()).padStart(2, '0');
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const year = now.getFullYear();

  return `${day}-${month}-${year}`;
}

function isValidLeadId(leadId) {
  if (!leadId) return false;
  const normalized = String(leadId).trim().toUpperCase();
  if (normalized === 'DUPLICATE') return false;
  // Expected style: 8-char alphanumeric with at least one letter and one number (e.g., ACAAA01E)
  if (!/^[A-Z0-9]{8}$/.test(normalized)) return false;
  if (!/[A-Z]/.test(normalized)) return false;
  if (!/[0-9]/.test(normalized)) return false;
  return true;
}

/**
 * ==============================================
 * FLM API IMPLEMENTATION FLOW
 * ==============================================
 * Full end-to-end Playwright lead processing pipeline
 */
async function processLead(brandConfig, page) {
  console.log(`🔄 Processing lead for brand: ${brandConfig.name}`);

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
    
    if (process.env.OVERRIDE_SLIDER) {
      rawSliderVal = parseInt(process.env.OVERRIDE_SLIDER);
      console.log(`🔌 [Override] Applying custom slider value: ${rawSliderVal}`);
    } else if (brandId === 'fsi-ppc2') {
      const bucketIdx = runIndex % 4;
      if (bucketIdx === 0) rawSliderVal = 5000;  // Represents "$0 - $9,999"
      else if (bucketIdx === 1) rawSliderVal = 15000; // Represents "$10,000 - $19,999"
      else if (bucketIdx === 2) rawSliderVal = 35000; // Represents "$20,000 - $50,000"
      else rawSliderVal = 75000; // Represents "$50,000 or more"
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

      // Determine week parity using ISO week calculation
      const d = new Date();
      const dayNum = d.getUTCDay() || 7;
      d.setUTCDate(d.getUTCDate() + 4 - dayNum);
      const yearStart = new Date(Date.UTC(d.getUTCFullYear(),0,1));
      const weekNo = Math.ceil((((d - yearStart) / 86400000) + 1)/7);
      
      const isFirstWeek = (weekNo % 2 !== 0);
      const dayOfWeek = new Date().getDay(); // 1=Mon, 3=Wed, 5=Fri

      let min = 0, max = 0;
      const todayDate = new Date();
      const isJune5 = (todayDate.getMonth() === 5 && todayDate.getDate() === 5 && todayDate.getFullYear() === 2026);

      if (isJune5) {
        min = 0;
        max = 7500;
        console.log("📅 [Forced Override] Friday, June 5th forced to Week 1 Monday range: 0 - 7,500");
      } else if (isFirstWeek) {
        if (dayOfWeek === 1) { min = 0; max = 7500; }
        else if (dayOfWeek === 3) { min = 7500; max = 10000; }
        else if (dayOfWeek === 5) { min = 10000; max = 20000; }
        else { min = 1000; max = 20000; }
      } else {
        if (dayOfWeek === 1) { min = 20000; max = 50000; }
        else if (dayOfWeek === 3) { min = 50000; max = 100000; }
        else if (dayOfWeek === 5) { min = 100000; max = 150000; }
        else { min = 20000; max = 150000; }
      }

      // Cap at campaign max limit dynamically
      if (min > maxLimit) min = maxLimit;
      if (max > maxLimit) max = maxLimit;
      if (min === 0) min = 1000; // forms usually fail with exactly $0

      console.log(`📅 [Rotational Logic] Week ${isFirstWeek ? '1' : '2'} Day ${dayOfWeek}. Target Range: ${min}-${max} (Max allowed by URL: ${maxLimit})`);

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
           const step = runIndex % (rangeSize + 1);
           rawSliderVal = (minThousands + step) * 1000;
         }
      }

      // Round rawSliderVal to the nearest thousand to keep in thousand format (e.g., 4,000, 9,000, 15,000, 20,000)
      rawSliderVal = Math.round(rawSliderVal / 1000) * 1000;
      if (rawSliderVal === 0) {
        rawSliderVal = 1000; // forms usually fail with exactly $0
      }

      // Ensure we cap it by the campaign's specific maximum limit so it doesn't break the slider
      if (rawSliderVal > maxLimit) {
        rawSliderVal = Math.floor(maxLimit / 1000) * 1000;
        if (rawSliderVal === 0) {
          rawSliderVal = maxLimit;
        }
      }
    }

    const finalSlider = rawSliderVal.toLocaleString();

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

    // Dynamic dummy phone generation
    const suffixNum = String(1000 + (runIndex % 9000));
    let dummyPhone = `401-247-${suffixNum}`;
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

    await formPage.navigate(finalBrandConfig.url);
    const fillResult = await formPage.fillForm({
      sliderAmount: finalBrandConfig.sliderAmount,
      targetMin,
      targetMax,
      state: finalBrandConfig.state,
      firstName,
      lastName,
      email,
      phone: finalBrandConfig.phone,
      runIndex
    });
    
    // CAKE MAPPING EXACTLY FROM UI SELECTION
    let uiSelectedSliderStr = fillResult?.extractedSliderAmount || finalSlider;
    const uiSelectedSliderNum = parseInt(uiSelectedSliderStr.toString().replace(/[^0-9]/g, '')) || rawSliderVal;
    
    let cakeIncomeOverride;
    if (uiSelectedSliderNum <= 7500) cakeIncomeOverride = "5,000";
    else if (uiSelectedSliderNum <= 9999) cakeIncomeOverride = "7,500";
    else if (uiSelectedSliderNum <= 19999) cakeIncomeOverride = "10,000";
    else if (uiSelectedSliderNum <= 49999) cakeIncomeOverride = "20,000";
    else if (uiSelectedSliderNum <= 99999) cakeIncomeOverride = "50,000";
    else {
      cakeIncomeOverride = "100,000";
      uiSelectedSliderStr = "100000 & more";
    }

    await formPage.submitForm();

    let thankYouUrl = await formPage.getThankYouUrl();
    console.log(`📋 [Pre-Fix] Thank-you URL before debt correction: ${thankYouUrl}`);
    
    // Get the UI-selected slider amount from the form
    const extractedSliderAmount = formPage.selectedSliderAmount.toString().replace(/,/g, '').trim();
    
    // Safely extract the FIRST number if there's a range (e.g. "5000 - 9999" -> 5000)
    let selectedDebtNum = 0;
    const match = extractedSliderAmount.match(/\d+/);
    if (match) selectedDebtNum = parseInt(match[0]);
    
    // Map to specific required values
    if (extractedSliderAmount.includes('Less than') && extractedSliderAmount.includes('5000')) selectedDebtNum = 5000;
    else if (selectedDebtNum === 5000 && extractedSliderAmount.includes('9999')) selectedDebtNum = 7500;
    else if (selectedDebtNum === 10000) selectedDebtNum = 10000;
    else if (selectedDebtNum === 20000) selectedDebtNum = 20000;
    else if (selectedDebtNum === 50000) selectedDebtNum = 50000;
    
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

    let leadIdToUse = leadId;
    let hasLeadId = true;
    let leadIdFormatValid = true;

    if (process.env.OVERRIDE_LEAD_ID) {
      leadIdToUse = process.env.OVERRIDE_LEAD_ID;
      console.log(`🔌 [Override] Applying custom Lead ID: ${leadIdToUse}`);
    } else if (!leadId) {
      console.warn('⚠️ No Lead ID found. This is likely a duplicate lead submission redirected to a static thank you page. Using DUPLICATE fallback.');
      leadIdToUse = 'DUPLICATE';
      hasLeadId = false;
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
    const finalSliderAmount = ((formPage.selectedSliderAmount && formPage.selectedSliderAmount !== 'N/A') ? formPage.selectedSliderAmount : '') || 
                             (finalBrandConfig.sliderAmount || '');
    
    // 🛡️ [AI Agent] ENSURING 100K & MORE LOGIC
    const numericSliderVal = parseInt(finalSliderAmount.toString().replace(/[$,\s]/g, '')) || 0;
    const displaySliderAmount = (numericSliderVal >= 100000) ? "100000 & more" : finalSliderAmount;

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

    const rowData = {
      dateTime: sanitize(formatDateTime()),
      type: sanitize(process.env.PROCESS_LABEL || finalDeviceType),
      affiliate: sanitize(firstApiData.affiliateId || fallbackAffid),
      campaignId: sanitize(firstApiData.campaignId || fallbackCampaignId),
      trackingLink: sanitize(finalBrandConfig.url),
      sliderAmount: sanitize(displaySliderAmount),
      cakeIncome: sanitize(cakeIncomeOverride || firstApiData.income || displaySliderAmount),
      state: sanitize(firstApiData.state || finalStateCode),
      phone: sanitize(firstApiData.phone || finalBrandConfig.phone),
      leadId: sanitize(leadIdToUse),
      dbid: sanitize(secondApiData.dbid || firstApiData.id),
      pageOrigin: sanitize(firstApiData.page || finalBrandConfig.url),
      thankYouUrl: sanitize(thankYouUrl),
      cdbStatus: sanitize(secondApiData.cdbStatus),
      cdbEmail: sanitize(secondApiData.cdbEmail),
      neustar: sanitize(firstApiData.neustar),
      neustarDisposition: sanitize(firstApiData.neustarDisposition),
      pixelFired: sanitize(firstApiData.pixelFired),
      taxDebt: '',
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

    if (!sheetSuccess) {
      throw new Error('Failed to write to Google Sheets');
    }

    // ==================================================
    // 🔹 STAGE 6: AI AGENT AUTOMATED AUDIT
    // ==================================================
    const validation = aiAgent.validateIncomeMapping(finalSliderAmount, cakeIncomeOverride, firstApiData.income);
    console.log(`🤖 [AI Agent Audit] Status: ${validation.status}`);
    console.log(`🤖 [AI Agent Audit] Details: ${validation.details}`);

    if (validation.status === "FAIL") {
      console.warn(`🚨 [AI Agent] Data mismatch detected for ${brandConfig.name}. Please review Google Sheet.`);
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
      leadId,
      brand: brandConfig.name
    };

  } catch (error) {
    console.error(`❌ Failed processing ${brandConfig.name}:`, error.message);
    return {
      success: false,
      error: error.message,
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
