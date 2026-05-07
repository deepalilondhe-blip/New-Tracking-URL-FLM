/**
 * ==============================================
 * FTH-X PLAYWRIGHT END-TO-END TEST
 * ==============================================
 * 
 * FULL EXECUTION FLOW:
 * 1. Playwright opens tracking URL
 * 2. Automatically fills multi-step form
 * 3. Submits form and extracts Lead ID from thank you page
 * 4. Calls FIRST API (GET XML) to retrieve lead metadata
 * 5. Calls SECOND API (POST JSON) to retrieve CDB validation data
 * 6. Appends all combined data to Google Sheets
 * 
 * STATUS: ✅ Fully Implemented
 * ==============================================
 */

const { test, expect } = require('@playwright/test');
const brands = require('../../config/brands');
const { processLead } = require('../../utils/leadProcessor');

test.describe('FTH-X Brand Tracking Test', () => {
  const fthxBrand = brands.find(brand => brand.name === 'FTH-X');

  test('should submit form, capture lead and log to Google Sheets', async ({ page }) => {
    test.setTimeout(120000);
    
    const result = await processLead(fthxBrand, page);
    
    expect(result.success).toBeTruthy();
    expect(result.leadId).not.toBeNull();
    expect(result.brand).toBe('FTH-X');
    
    console.log(`✅ Test completed successfully. Lead ID: ${result.leadId}`);
  });
});