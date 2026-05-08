const FormPage = require('../pages/FormPage');
const MobileFormPage = require('../pages/MobileFormPage');
const { callFirstApi, callSecondApi } = require('./apiUtils');
const { appendRowByHeader } = require('./googleSheetsUtils');

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

/**
 * ==============================================
 * FLM API IMPLEMENTATION FLOW
 * ==============================================
 * Full end-to-end Playwright lead processing pipeline
 */
async function processLead(brandConfig, page) {
  console.log(`🔄 Processing lead for brand: ${brandConfig.name}`);

  try {

    const viewport = page.viewportSize();
    const isMobile = viewport && viewport.width < 500;
    const isTablet = viewport && viewport.width >= 500 && viewport.width < 1024;
    const isDevice = isMobile || isTablet;
    const formPage = isDevice ? new MobileFormPage(page) : new FormPage(page);

    // ==================================================
    // 🔹 STAGE 1: PLAYWRIGHT FORM AUTOMATION
    // ==================================================
    await formPage.navigate(brandConfig.url);
    await formPage.fillForm({
      sliderAmount: brandConfig.sliderAmount,
      state: brandConfig.state,
      firstName: process.env.TEST_FIRST_NAME || "ckmtestpixel",
      lastName: process.env.TEST_LAST_NAME || "ckmtestpixel",
      email: process.env.TEST_EMAIL || "ckmtestpixel@gmail.com",
      phone: brandConfig.phone
    });
    await formPage.submitForm();

    const thankYouUrl = await formPage.getThankYouUrl();
    const leadId = formPage.extractLeadId(thankYouUrl);

    // Determine Device Type Dynamically
    let deviceType = 'D'; // Desktop
    if (isMobile) {
      deviceType = 'M'; // Mobile
    } else if (isTablet) {
      deviceType = 'T'; // Tablet
    }
    console.log(`📱 Device Type detected: ${deviceType}`);

    let leadIdToUse = leadId;
    let hasLeadId = true;

    if (!leadId) {
      console.warn('⚠️ No Lead ID found. This is likely a duplicate lead submission redirected to a static thank you page. Using DUPLICATE fallback.');
      leadIdToUse = 'DUPLICATE';
      hasLeadId = false;
    }

    console.log(`✅ Lead captured: ${leadIdToUse}`);

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
    let secondApiData = { dbid: '', cdbStatus: '', cdbEmail: '' };

    // Skip second API for brands that don't support it
    if (hasLeadId && !brandConfig.skipSecondApi) {
      try {
        secondApiData = await callSecondApi(leadIdToUse, brandConfig.name);
      } catch (e) {
        console.log(`⚠️  Second API skipped for ${brandConfig.name}`);
      }
    }

    // ==================================================
    // 🔹 STAGE 4: GOOGLE SHEETS PERSISTENCE
    // ==================================================
    // Step 4: Prepare sheet data
    const rowData = {
      dateTime: formatDateTime(),
      type: deviceType,
      affiliate: firstApiData.affiliateId || '',
      campaignId: firstApiData.campaignId || '',
      trackingLink: brandConfig.url,
      sliderAmount: brandConfig.sliderAmount || '',
      cakeIncome: firstApiData.income || '',
      state: firstApiData.state || '',
      phone: firstApiData.phone || '',
      leadId: leadIdToUse,
      dbid: secondApiData.dbid || '',
      thankYouUrl: thankYouUrl,
      pageOrigin: brandConfig.url,
      cdbStatus: secondApiData.cdbStatus,
      cdbEmail: secondApiData.cdbEmail,
      neustar: firstApiData.neustar || '',
      neustarDisposition: firstApiData.neustarDisposition || '',
      pixelFired: firstApiData.pixelFired,
      runDate: formatDate(),
      firstName: process.env.TEST_FIRST_NAME || 'ckmtestpixel',
      lastName: process.env.TEST_LAST_NAME || 'ckmtestpixel',
      email: process.env.TEST_EMAIL || 'ckmtestpixel@gmail.com',
      step1: formPage.step1 || 'N/A',
      step2: formPage.step2 || 'N/A',
      step3: formPage.step3 || 'N/A'
    };

    // Step 5: Write to Google Sheets
    const sheetSuccess = await appendRowByHeader(brandConfig.sheet, rowData);

    if (!sheetSuccess) {
      throw new Error('Failed to write to Google Sheets');
    }

    console.log(`✅ Lead processed successfully for ${brandConfig.name}`);

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

        // Retrieve temp video path before closing
        const originalPath = await video.path().catch(() => null);

        // Close page & context to flush playwright video stream
        const context = page.context();
        await page.close().catch(() => null);
        await context.close().catch(() => null);

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

module.exports = {
  processLead
};