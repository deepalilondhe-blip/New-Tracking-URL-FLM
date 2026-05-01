const axios = require('axios');
const xml2js = require('xml2js');
require('dotenv').config();

const parser = new xml2js.Parser({ explicitArray: false });

async function callFirstApi(leadId) {
  try {
    const response = await axios.get(process.env.FIRST_API_BASE_URL, {
      params: {
        api_key: process.env.FIRST_API_KEY,
        lead_id: leadId,
        vertical_id: process.env.VERTICAL_ID
      }
    });

    const xmlResult = await parser.parseStringPromise(response.data);
    const lead = xmlResult.LeadInfo.Lead || {};

    return {
      phone: lead.phone_home || '',
      state: lead.state || '',
      income: lead.income || lead.monthly_income || '',
      affiliateId: lead.affiliate_id || '',
      campaignId: lead.campaign_id || '',
      neustar: lead.neustar || '',
      neustarDisposition: lead.neustar_disposition || '',
      pixelFired: lead.pixel_fired || 'FALSE'
    };
  } catch (error) {
    console.error('First API Error:', error.message);
    return {};
  }
}

async function callSecondApi(leadId, domainName) {
  try {
    const seniorBrands = ['Senior Tax Defence', 'Senior Tax Defence 2', 'Everest Tax Relief'];
    const isSeniorBrand = seniorBrands.some(brand => domainName.includes(brand));
    
    const apiUrl = isSeniorBrand 
      ? process.env.SECOND_API_URL_SENIOR 
      : process.env.SECOND_API_URL_STANDARD;

    const response = await axios.post(apiUrl, 
      new URLSearchParams({ lead_id: leadId }).toString(),
      { headers: { 'Content-Type': 'application/x-www-form-urlencoded' } }
    );

    const data = response.data || {};

    return {
      dbid: data.dbid || '',
      cdbStatus: data.cdb_status || 'FALSE',
      cdbEmail: data.cdb_email || ''
    };
  } catch (error) {
    console.error('Second API Error:', error.message);
    return {};
  }
}

module.exports = {
  callFirstApi,
  callSecondApi
};