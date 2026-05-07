const axios = require('axios');
const xml2js = require('xml2js');
require('dotenv').config();

const parser = new xml2js.Parser({ explicitArray: false });

async function callFirstApi(leadId) {
  const maxRetries = 3;
  console.log(`📡 Fetching First API data for Lead ID: ${leadId}...`);
  
  // Initial delay to allow backend to process lead
  await new Promise(resolve => setTimeout(resolve, 5000));

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      const response = await axios.get(process.env.FIRST_API_BASE_URL, {
        params: {
          api_key: process.env.FIRST_API_KEY,
          lead_id: leadId,
          vertical_id: process.env.VERTICAL_ID
        }
      });

      const xmlResult = await parser.parseStringPromise(response.data);
      console.log('📡 Raw XML Response:', JSON.stringify(xmlResult, null, 2));
      
      const responseRoot = xmlResult?.lead_info_response;

      if (responseRoot && responseRoot.success === 'true') {
        console.log(`✅ First API Data retrieved on attempt ${attempt}`);
        
        const traffic = responseRoot.traffic_info || {};
        const verticalData = responseRoot.all_vertical_data?.data || {};
        const personal = responseRoot.personal_info || {};
        const dispositions = responseRoot.dispositions?.disposition;
        
        // Handle Neustar Disposition
        const nDisposition = verticalData.neustar_disposition 
          || (Array.isArray(dispositions) ? dispositions[0]?.reason : dispositions?.reason)
          || '';

        return {
          phone: personal.phone_home || personal.phone || '',
          state: personal.address?.state || '',
          income: verticalData.tax_debt || verticalData.income || verticalData.monthly_income || '',
          affiliateId: traffic.affiliate?.affiliate_id?._ || traffic.affid || '',
          campaignId: traffic.campaign?.campaign_id?._ || '',
          neustar: verticalData.neustar || '',
          neustarDisposition: nDisposition,
          pixelFired: (traffic.pixel_fired === 'true' ? 'TRUE' : 'FALSE')
        };
      } else {
        console.warn(`⚠️  Attempt ${attempt}: First API returned empty lead data or success=false`);
      }
    } catch (error) {
      console.error(`❌ First API Attempt ${attempt} failed:`, error.message);
    }
    
    if (attempt < maxRetries) {
      console.log(`⏳ Retrying in 5 seconds...`);
      await new Promise(resolve => setTimeout(resolve, 5000));
    }
  }

  return {};
}

async function callSecondApi(leadId, domainName) {
  const maxRetries = 2;
  console.log(`📡 Fetching Second API data for Lead ID: ${leadId}...`);

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
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

      if (data.dbid) {
        console.log(`✅ Second API Data retrieved on attempt ${attempt}`);
        return {
          dbid: data.dbid || '',
          cdbStatus: data.cdb_status || 'FALSE',
          cdbEmail: data.cdb_email || ''
        };
      } else {
        console.warn(`⚠️  Attempt ${attempt}: Second API returned no DBID`);
      }
    } catch (error) {
      console.error(`❌ Second API Attempt ${attempt} failed:`, error.message);
    }

    if (attempt < maxRetries) {
      console.log(`⏳ Retrying in 5 seconds...`);
      await new Promise(resolve => setTimeout(resolve, 5000));
    }
  }

  return {};
}

module.exports = {
  callFirstApi,
  callSecondApi
};