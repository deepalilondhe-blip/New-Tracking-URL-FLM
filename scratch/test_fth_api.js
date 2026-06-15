const apiUtils = require('../utils/apiUtils');

async function testFth() {
  const leadId = '51C5BB72';
  const domain = 'https://fresh-tax-help.com';
  console.log(`📡 Calling Second API for Lead ID: ${leadId} with domain: ${domain}...`);
  const result = await apiUtils.callSecondApi(leadId, domain);
  console.log('🎉 Response result:', JSON.stringify(result, null, 2));
}

testFth();
