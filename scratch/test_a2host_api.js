const sheetUtils = require('../utils/googleSheetsUtils');
const apiUtils = require('../utils/apiUtils');

const domainsToTest = [
  { name: 'Fresh Start Initiative', tab: 'FSI-PPC2', domain: 'https://www.fresh-start-initiative.com' },
  { name: 'Fidelity Tax Defense', tab: 'FTD-X', domain: 'https://fidelity-tax-defense.net' },
  { name: 'Veterans Tax Services', tab: 'VTS-Original', domain: 'https://www.veteranstaxservices.com' },
  { name: '1800 Fresh Tax', tab: '1800 Fresh Tax (X) Main', domain: 'https://www.1800freshtax.com' }
];

async function runTests() {
  console.log('🚀 Starting A2Hosting API Verification...\n');
  
  for (const item of domainsToTest) {
    console.log(`================================================================`);
    console.log(`🧪 Testing: ${item.name}`);
    console.log(`================================================================`);
    
    try {
      console.log(`📊 Fetching latest Lead ID from Google Sheet tab: "${item.tab}"...`);
      const leadId = await sheetUtils.getLatestLeadIdFromSheet(item.tab);
      
      if (!leadId) {
        console.log(`⚠️  No Lead ID found for tab "${item.tab}"! Skipping...\n`);
        continue;
      }
      
      console.log(`✅ Found Lead ID: ${leadId}`);
      console.log(`📡 Calling Second API via A2Hosting for domain: ${item.domain}...`);
      
      const apiResult = await apiUtils.callSecondApi(leadId, item.domain);
      
      console.log(`\n🎉 Result for ${item.name}:`);
      console.log(`   ✅ DBID          : ${apiResult.dbid || 'NOT FOUND'}`);
      console.log(`   ✅ CDB Status    : ${apiResult.cdbStatus}`);
      console.log(`   ✅ CDB Email     : ${apiResult.cdbEmail}\n`);
      
    } catch (e) {
      console.error(`❌ Error testing ${item.name}:`, e.message, '\n');
    }
  }
  
  console.log('✅ All A2Hosting API verifications completed!');
}

runTests();
