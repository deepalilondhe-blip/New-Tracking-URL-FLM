process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';
const axios = require('axios');

async function testApi() {
  const oldLeads = ['1788DC88', '4671FE4D', 'EA224C25'];
  const url = 'https://everesttaxrelief.net/api-qa-automation-atwohosting/getData.php';
  const domain = 'https://everesttaxrelief.net';

  for (const leadId of oldLeads) {
    try {
      const params = new URLSearchParams();
      params.append('cake_id', leadId);
      params.append('domain_name', domain);

      console.log(`\nQuerying Senior API for VTS lead: "${leadId}" with domain: "${domain}"`);
      const response = await axios.post(url, params.toString(), {
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
      });

      console.log('Response Status:', response.status);
      console.log('Response Data:', JSON.stringify(response.data, null, 2));
    } catch (err) {
      console.error(`Error with lead ${leadId}:`, err.message);
    }
  }
}

testApi();
