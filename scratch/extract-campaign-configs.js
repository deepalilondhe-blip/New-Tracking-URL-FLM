const fs = require('fs');
const path = require('path');

// List of standard desktop runners to extract metadata from
const desktopRunners = [
  { id: 'ftd-x', file: 'run-ftd-x.js' },
  { id: 'fsi-ppc2', file: 'run-fsi-ppc2.js' },
  { id: 'tra-cpl', file: 'run-tra-cpl.js' },
  { id: 'tra-d3', file: 'run-tra-d3.js' },
  { id: 'ppc-st', file: 'run-ppc-st.js' },
  { id: 'ppc-st2', file: 'run-ppc-st2.js' },
  { id: 'ppc-m-ca', file: 'run-ppc-m-ca.js' },
  { id: 'ppc-cr', file: 'run-ppc-cr.js' },
  { id: 'ppc-fs', file: 'run-ppc-fs.js' },
  { id: 'ppc', file: 'run-ppc.js' },
  { id: 'tra-cpm', file: 'run-tra-cpm.js' },
  { id: 'fth-x', file: 'run-fth-x.js' },
  { id: 'everest-tr-x', file: 'run-everest-tr-x.js' },
  { id: 'vts-original', file: 'run-vts-original.js' },
  { id: '1800-fresh-tax-x-main', file: 'run-1800-fresh-tax-x-main.js' }
];

const campaigns = [];

for (const runner of desktopRunners) {
  const filePath = path.join(__dirname, '..', runner.file);
  if (!fs.existsSync(filePath)) {
    console.warn(`⚠️ File not found: ${runner.file}`);
    continue;
  }

  const content = fs.readFileSync(filePath, 'utf8');
  
  // Use regex to capture the brand object declaration
  const brandRegex = /const\s+brand\s*=\s*({[\s\S]*?});/;
  const match = content.match(brandRegex);

  if (match) {
    try {
      // Evaluate the javascript object safely into a JSON object
      const objectStr = match[1];
      // Convert to strict JSON by evaluating inside a dynamic function
      const evalFn = new Function(`return ${objectStr};`);
      const brandObj = evalFn();

      // standardise into central config
      campaigns.push({
        id: runner.id,
        name: brandObj.name || runner.id.toUpperCase(),
        url: brandObj.url || '',
        sheet: brandObj.sheet || brandObj.name || runner.id.toUpperCase(),
        sliderAmount: brandObj.sliderAmount || '50,000',
        state: brandObj.state || 'Maine',
        phone: brandObj.phone || '',
        skipSecondApi: brandObj.skipSecondApi || false
      });

      console.log(`✅ Extracted metadata for: ${runner.id}`);
    } catch (e) {
      console.error(`❌ Failed to parse brand object for ${runner.file}:`, e.message);
    }
  } else {
    console.warn(`⚠️ No brand object found in ${runner.file}`);
  }
}

// Ensure config directory exists
const configDir = path.join(__dirname, '..', 'config');
if (!fs.existsSync(configDir)) {
  fs.mkdirSync(configDir);
}

const configFilePath = path.join(configDir, 'campaigns.json');
fs.writeFileSync(configFilePath, JSON.stringify(campaigns, null, 2), 'utf8');

console.log(`\n🎉 Success! Centralized configuration written to: config/campaigns.json`);
console.log(`Total Campaigns Processed: ${campaigns.length}`);
