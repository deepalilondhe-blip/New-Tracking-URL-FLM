const { test, expect } = require('@playwright/test');
const brands = require('../../config/brands');
const { processLead } = require('../../utils/leadProcessor');

test.describe('FTD Brand Tracking Test', () => {
  const ftdBrand = brands.find(brand => brand.name === 'FTD');

  test('should submit form, capture lead and log to Google Sheets', async ({ page }) => {
    test.setTimeout(60000);
    
    const result = await processLead(ftdBrand, page);
    
    expect(result.success).toBeTruthy();
    expect(result.leadId).not.toBeNull();
    expect(result.brand).toBe('FTD');
    
    console.log(`Test completed successfully. Lead ID: ${result.leadId}`);
  });
});