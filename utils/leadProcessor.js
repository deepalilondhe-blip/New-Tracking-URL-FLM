const FormPage = require('../pages/FormPage');
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

async function processLead(brandConfig, page) {
  console.log(`🔄 Processing lead for brand: ${brandConfig.name}`);
  
  try {
    const formPage = new FormPage(page);
    
    // Step 1: Navigate and submit form
    await formPage.navigate(brandConfig.url);
    await formPage.fillForm();
    await formPage.submitForm();
    
    const thankYouUrl = await formPage.getThankYouUrl();
    const leadId = formPage.extractLeadId(thankYouUrl);
    
    if (!leadId) {
      throw new Error('Lead ID not found in thank you URL');
    }
    
    console.log(`✅ Lead captured: ${leadId}`);
    
    // Step 2: Call first API
    const firstApiData = await callFirstApi(leadId);
    
    // Step 3: Call second API
    const secondApiData = await callSecondApi(leadId, brandConfig.name);
    
    // Step 4: Prepare sheet data
    const rowData = {
      dateTime: formatDateTime(),
      affiliate: firstApiData.affiliateId || '',
      campaignId: firstApiData.campaignId || '',
      trackingLink: brandConfig.url,
      sliderAmount: '10000',
      cakeIncome: firstApiData.income || '',
      state: firstApiData.state || '',
      phone: firstApiData.phone || '',
      leadId: leadId,
      dbid: secondApiData.dbid || '',
      thankYouUrl: thankYouUrl,
      pageOrigin: brandConfig.url,
      cdbStatus: secondApiData.cdbStatus,
      cdbEmail: secondApiData.cdbEmail,
      neustar: firstApiData.neustar || 'No',
      neustarDisposition: firstApiData.neustarDisposition || '',
      pixelFired: firstApiData.pixelFired,
      runDate: formatDate()
    };
    
    // Step 5: Write to Google Sheets
    const sheetSuccess = await appendRowByHeader(brandConfig.sheet, rowData);
    
    if (!sheetSuccess) {
      throw new Error('Failed to write to Google Sheets');
    }
    
    console.log(`✅ Lead processed successfully for ${brandConfig.name}`);
    
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