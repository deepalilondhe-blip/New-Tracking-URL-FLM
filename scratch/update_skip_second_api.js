const fs = require('fs');
const path = require('path');

const configPath = path.resolve(__dirname, '..', 'config', 'campaigns.json');
const campaigns = JSON.parse(fs.readFileSync(configPath, 'utf8'));

// List of all TRA/GT/LIST campaign IDs
const traCampaignIds = [
  'tra-list',
  'tra-d3',
  'ppc-st',
  'ppc-st2',
  'ppc-m-ca',
  'ppc-cr',
  'ppc-fs',
  'tra-cpm',
  'guardian-tax-relief-ppc',
  'tra-st-tsg',
  'tra-st-tf',
  'tra-st-sp',
  'tra-ppc-v9',
  'tra-ppcbtr',
  'tra-ppcbm'
];

let updatedCount = 0;
campaigns.forEach(campaign => {
  if (traCampaignIds.includes(campaign.id)) {
    if (campaign.skipSecondApi !== true) {
      campaign.skipSecondApi = true;
      updatedCount++;
    }
  }
});

fs.writeFileSync(configPath, JSON.stringify(campaigns, null, 2), 'utf8');
console.log(`✅ Successfully updated skipSecondApi to true for ${updatedCount} TRA campaigns!`);
