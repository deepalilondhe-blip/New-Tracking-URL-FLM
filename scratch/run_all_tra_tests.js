const { exec } = require('child_process');
const path = require('path');

const campaigns = [
  { id: 'tra-cpm', name: 'TRA cpm2 (as it is)' },
  { id: 'tra-d3', name: 'TRA dt3 (as it is)' },
  { id: 'tra-st-tsg', name: 'TRA st/tsg (floor 5k)' },
  { id: 'tra-st-tf', name: 'TRA st/tf (floor 5k)' },
  { id: 'tra-ppc-v9', name: 'TRA v9 (floor 5k)' },
  { id: 'ppc-st', name: 'TRA ppc/st (floor 5k)' },
  { id: 'ppc-st2', name: 'TRA ppc/st2 (as it is)' },
  { id: 'ppc-m-ca', name: 'TRA ppcm/ca (floor 5k)' },
  { id: 'ppc-fs', name: 'TRA ppc/fs (floor 5k)' },
  { id: 'ppc-cr', name: 'TRA ppc-cr (floor 5k)' },
  { id: 'tra-ppcbm', name: 'TRA ppc-bm (floor 5k)' },
  { id: 'tra-list', name: 'TRA list (as it is)' }
];

function runCampaign(campaign) {
  return new Promise((resolve) => {
    console.log(`\n======================================================`);
    console.log(`🚀 RUNNING TEST FOR: ${campaign.name} (${campaign.id})`);
    console.log(`======================================================`);

    const cmd = `node run-master.js --campaign ${campaign.id} --viewport desktop --headed`;
    const child = exec(cmd, { cwd: path.resolve(__dirname, '..') });

    let stdout = '';
    child.stdout.on('data', (data) => {
      stdout += data;
      // print progress in real time
      process.stdout.write(data);
    });

    child.stderr.on('data', (data) => {
      process.stderr.write(data);
    });

    child.on('close', (code) => {
      // Parse output for verification metrics
      let sliderVal = 'Unknown';
      let cakeIncome = 'Unknown';
      let leadId = 'Unknown';
      let auditStatus = 'Unknown';
      let details = '';

      const sliderMatch = stdout.match(/Set jQuery UI Slider #slider to\s*([0-9,]+)/i) || stdout.match(/Dropdown option:\s*"([^"]+)"/i);
      if (sliderMatch) sliderVal = sliderMatch[1];

      const cakeMatch = stdout.match(/💡 \[cakeIncomeOverride\] TRA Link:\s*\d+\s*→\s*([0-9,]+)/i);
      if (cakeMatch) cakeIncome = cakeMatch[1];

      const leadMatch = stdout.match(/✅ Extracted Lead ID:\s*([A-Z0-9]+)/i) || stdout.match(/✅ Lead captured:\s*([A-Z0-9]+)/i);
      if (leadMatch) leadId = leadMatch[1];

      const auditMatch = stdout.match(/🤖 \[AI Agent Audit\] Status:\s*(PASS|FAIL)/i);
      if (auditMatch) auditStatus = auditMatch[1];

      const detailsMatch = stdout.match(/🤖 \[AI Agent Audit\] Details:\s*(.*)/i);
      if (detailsMatch) details = detailsMatch[1];

      resolve({
        id: campaign.id,
        name: campaign.name,
        success: code === 0 && auditStatus === 'PASS',
        leadId,
        sliderVal,
        cakeIncome,
        auditStatus,
        details
      });
    });
  });
}

(async () => {
  const results = [];
  for (const campaign of campaigns) {
    const res = await runCampaign(campaign);
    results.push(res);
  }

  console.log('\n\n======================================================');
  console.log('📊 FINAL TRA CAMPAIGN VALIDATION REPORT');
  console.log('======================================================');
  console.table(results.map(r => ({
    Campaign: r.name,
    'Lead ID': r.leadId,
    'Slider Value': r.sliderVal,
    'Cake Income': r.cakeIncome,
    Audit: r.auditStatus,
    Details: r.details
  })));
})();
