const { chromium } = require('playwright');
const { processLead } = require('../utils/leadProcessor');
const campaigns = require('../config/campaigns.json');

(async () => {
    // 1. Launch browser in visible mode
    const browser = await chromium.launch({ headless: false, slowMo: 500 });
    const page = await browser.newPage();

    // 2. Target FTD-X
    const brand = campaigns.find(c => c.id === 'ftd-x');
    
    console.log('🧪 RUNNING VERIFICATION TEST: 100k+ Reporting Logic');
    
    try {
        // We run it manually. The logic in leadProcessor will pick a random value.
        // If the rotation is at the end of the 7-range cycle, it will hit 100k+.
        const result = await processLead(brand, page);
        console.log('✅ Verification Run Completed:', JSON.stringify(result, null, 2));
    } catch (e) {
        console.error('❌ Verification Run Failed:', e.message);
    } finally {
        await browser.close();
    }
})();
