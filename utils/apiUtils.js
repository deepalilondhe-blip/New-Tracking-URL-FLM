process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';
const axios = require('axios');
const xml2js = require('xml2js');
require('dotenv').config();

const parser = new xml2js.Parser({ explicitArray: false });

async function callFirstApi(leadId) {
  const maxRetries = 6;
  console.log(`📡 Fetching First API data for Lead ID: ${leadId}...`);
  
  // Initial delay to allow backend to process lead properly
  await new Promise(resolve => setTimeout(resolve, 2000));

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
          id: responseRoot.id || '',
          phone: personal.phone_home || personal.phone || '',
          state: personal.address?.state || '',
          income: verticalData.tax_debt || verticalData.income || verticalData.monthly_income || '',
          affiliateId: traffic.affiliate?.affiliate_id?._ || traffic.affid || '',
          campaignId: traffic.campaign?.campaign_id?._ || '',
          page: verticalData.page || '',
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
      console.log(`⏳ Retrying in 1.5 seconds...`);
      await new Promise(resolve => setTimeout(resolve, 1500));
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
    return 'https://www.fresh-start-initiative.com';
  }
  if (brand.includes('TRA') || brand.includes('PPC') || brand.includes('Advocates')) {
    return 'https://www.taxreliefadvocates.com';
  }
  if (brand.includes('FTH') || brand.includes('Fresh Tax Help')) {
    return 'https://fresh-tax-help.com';
  }
  if (brand.includes('1800') || brand.includes('Fresh Tax')) {
    return 'https://www.1800freshtax.com';
  }
  if (brand.includes('SCTR') || brand.includes('Second Chance')) {
    return 'https://www.secondchancetaxrelief.com';
  }
  if (brand.includes('SCTD') || brand.includes('Senior Tax Defence') || brand.includes('Senior Tax Defense') || brand.includes('Guardian')) {
    return 'https://www.seniortaxdefense.com';
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
    return 'https://www.premier-taxrelief.com';
  }
  
  return 'https://fidelity-tax-defense.net'; // Default fallback
}

async function callSecondApi(leadId, domainName) {
  const maxRetries = 5;
  console.log(`📡 Fetching Second API data for Lead ID: ${leadId}...`);

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      // Resolve the actual domain first (whether passed as URL or brand name)
      const resolvedDomain = domainName.startsWith('http')
        ? domainName.replace(/\/$/, '')
        : getDomainNameForBrand(domainName);

      const dl = resolvedDomain.toLowerCase();
      const isEverest = dl.includes('everest');
      const isVts = dl.includes('veteranstaxservices') || dl.includes('vts');
      const isFsi = dl.includes('fresh-start') || dl.includes('freshstart') || dl.includes('freshstartinitiative');
      const isFtd = dl.includes('fidelity-tax');
      const is1800 = dl.includes('1800freshtax');
      const isSenior = dl.includes('seniortaxdefense') || dl.includes('seniortaxdefence') || dl.includes('senior-tax');

      const isA2Host = isEverest || isVts || isFsi || isFtd || is1800 || isSenior;

      let apiUrl;
      const params = new URLSearchParams();

      if (isA2Host) {
        apiUrl = 'https://everesttaxrelief.net/api-qa-automation-atwohosting/getData.php';

        params.append('cake_id', leadId);
        params.append('domain_name', resolvedDomain);
        console.log(`📡 A2Hosting Second API Payload: cake_id=${leadId}, domain_name=${resolvedDomain}`);

      } else {
        const seniorBrands = ['Senior Tax Defence', 'Senior Tax Defence 2'];
        const isSeniorBrand = seniorBrands.some(brand => domainName.includes(brand));
        
        apiUrl = isSeniorBrand 
          ? process.env.SECOND_API_URL_SENIOR 
          : process.env.SECOND_API_URL_STANDARD;

        if (isSeniorBrand) {
          params.append('lead_id', leadId);
        } else {
          params.append('cake_id', leadId);
          params.append('domain_name', resolvedDomain);
          console.log(`📡 Standard FLM-Utility Second API Payload: cake_id=${leadId}, domain_name=${resolvedDomain}`);
        }
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

      // Check if data is nested in data[0], data["0"], or at root
      let item = data;
      if (data.data) {
        if (Array.isArray(data.data) && data.data[0]) item = data.data[0];
        else if (data.data["0"]) item = data.data["0"];
        else item = data.data;
      }
      
      const foundDbid = item.id || item.dbid || data.dbid || '';

      if (foundDbid) {
        console.log(`✅ Second API Data retrieved on attempt ${attempt}: DBID=${foundDbid}`);
        return {
          dbid: foundDbid,
          cdbStatus: item.cdb_status || data.cdb_status || 'FALSE',
          cdbEmail: item.cdb_validation_result || item.cdb_email || data.cdb_email || 'Verified'
        };
      } else {
        console.warn(`⚠️  Attempt ${attempt}: Second API returned no DBID. Response:`, JSON.stringify(data));
      }
    } catch (error) {
      console.error(`❌ Second API Attempt ${attempt} failed:`, error.message);
    }

    if (attempt < maxRetries) {
      console.log(`⏳ Retrying in 1 second to allow database synchronization...`);
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
  }

  return {
    dbid: '',
    cdbStatus: 'FALSE',
    cdbEmail: 'Verified'
  };
}

module.exports = {
  callFirstApi,
  callSecondApi
};