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

function getDomainNameForBrand(brandName) {
  const brand = brandName.trim();
  
  if (brand.includes('FTD') || brand.includes('Fidelity')) {
    return 'https://fidelity-tax-defense.net';
  }
  if (brand.includes('VTS') || brand.includes('Veterans')) {
    return 'https://www.veteranstaxservices.com';
  }
  if (brand.includes('FSI') || brand.includes('Fresh Start')) {
    return 'https://www.freshstartinitiative.com';
  }
  if (brand.includes('TRA') || brand.includes('PPC') || brand.includes('Advocates')) {
    return 'https://www.taxreliefadvocates.com';
  }
  if (brand.includes('1800') || brand.includes('FTH') || brand.includes('Fresh Tax')) {
    return 'https://www.1800freshtax.com';
  }
  if (brand.includes('SCTR') || brand.includes('Second Chance')) {
    return 'https://www.secondchancetaxrelief.com';
  }
  if (brand.includes('SCTD') || brand.includes('Senior Tax Defence')) {
    return 'https://www.seniortaxdefence.com';
  }
  if (brand.includes('Guardian')) {
    return 'https://www.guardiantaxrelief.com';
  }
  if (brand.includes('Everest')) {
    return 'https://www.everesttaxrelief.com';
  }
  if (brand.includes('Empire')) {
    return 'https://www.empiretaxrelief.com';
  }
  if (brand.includes('Capital')) {
    return 'https://www.capitaltaxrelief.com';
  }
  if (brand.includes('AFTR') || brand.includes('America Fresh')) {
    return 'https://www.americafreshtaxrelief.com';
  }
  if (brand.includes('Premier')) {
    return 'https://www.premiertaxrelief.com';
  }
  
  return 'https://fidelity-tax-defense.net'; // Default fallback
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

      const params = new URLSearchParams();
      if (isSeniorBrand) {
        params.append('lead_id', leadId);
      } else {
        params.append('cake_id', leadId);
        const resolvedDomain = getDomainNameForBrand(domainName);
        params.append('domain_name', resolvedDomain);
        console.log(`📡 Standard Second API Payload: cake_id=${leadId}, domain_name=${resolvedDomain}`);
      }

      const response = await axios.post(apiUrl, 
        params.toString(),
        { 
          headers: { 
            'Content-Type': 'application/x-www-form-urlencoded',
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
          } 
        }
      );

      const data = response.data || {};

      if (data.dbid) {
        console.log(`✅ Second API Data retrieved on attempt ${attempt}: dbid=${data.dbid}`);
        return {
          dbid: data.dbid || '',
          cdbStatus: data.cdb_status || 'FALSE',
          cdbEmail: data.cdb_email || ''
        };
      } else {
        console.warn(`⚠️  Attempt ${attempt}: Second API returned no DBID. Response:`, JSON.stringify(data));
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