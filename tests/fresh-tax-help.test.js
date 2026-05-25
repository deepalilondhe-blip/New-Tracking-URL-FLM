// @ts-check
const { test, expect } = require('@playwright/test');
const { appendRowByHeader } = require('../utils/googleSheetsUtils');

test.skip('Fresh Tax Help Form Submission & Tracking', async ({ page }) => {
  // Test Data
  const debtAmount = '10000';
  const leadId = 'C89FCCA9';
  const affid = '659';
  const reqid = '26749019';
  const state = 'ME';
  const firstName = 'ckmtestpixel';
  const lastName = 'ckmtestpixel';
  const email = 'ckmtestpixel@gmail.com';

  console.log('🚀 Starting Fresh Tax Help test flow...');

  // Step 1: Navigate to form page via active tracking URL
  await page.goto(`https://fthmlf-trk.com/?a=${affid}&oc=821&c=81&s1=`);
  await page.waitForLoadState('networkidle');
  console.log('✅ Loaded form page');

  // Extract dynamic reqid from the redirected URL
  const currentUrl = page.url();
  let dynamicReqId = reqid;
  try {
    const urlObj = new URL(currentUrl);
    dynamicReqId = urlObj.searchParams.get('reqid') || reqid;
    console.log(`✅ Extracted dynamic reqid: ${dynamicReqId}`);
  } catch (err) {
    console.warn('⚠️ Failed to parse dynamic reqid from URL:', err.message);
  }

  // Step 2: Select debt amount
  const debtSlider = page.locator('span').filter({ hasText: '$10,000' });
  await debtSlider.waitFor({ state: 'visible', timeout: 15000 });
  await debtSlider.click();
  console.log('✅ Selected $10,000 debt amount');

  // Step 3: Wait for state dropdown to become visible after selection
  await page.waitForTimeout(1500);
  const stateSelect = page.locator('#state');
  await stateSelect.waitFor({ state: 'visible', timeout: 15000 });
  await stateSelect.selectOption(state);
  console.log(`✅ Selected state: ${state}`);

  // Step 4: Click NEXT button
  const nextButton = page.getByRole('button', { name: 'NEXT' });
  await nextButton.waitFor({ state: 'visible', timeout: 10000 });
  await nextButton.click();
  console.log('✅ Clicked NEXT button');
  await page.waitForTimeout(1000);

  // Step 5: Fill first name
  await page.getByRole('textbox', { name: 'Please enter your name:' }).click();
  await page.getByRole('textbox', { name: 'Please enter your name:' }).fill(firstName);
  console.log('✅ Entered first name');

  // Step 6: Fill last name
  await page.getByPlaceholder('Last Name').click();
  await page.getByPlaceholder('Last Name').fill(lastName);
  console.log('✅ Entered last name');

  // Step 7: Fill email
  await page.getByRole('textbox', { name: 'What is your email address :' }).click();
  await page.getByRole('textbox', { name: 'What is your email address :' }).fill(email);
  console.log('✅ Entered email address');

  // Step 8: Submit form
  await page.locator('#submitBtn').click();
  console.log('✅ Form submitted');

  // Wait for navigation/thank you page
  await page.waitForLoadState('networkidle');

  // Extract dynamic leadid from the redirect URL (if present)
  const finalPageUrl = page.url();
  console.log(`📍 Final Page URL: ${finalPageUrl}`);
  let dynamicLeadId = leadId;
  try {
    const urlObj = new URL(finalPageUrl);
    dynamicLeadId = urlObj.searchParams.get('leadid') || urlObj.searchParams.get('transaction_id') || leadId;
    console.log(`✅ Extracted dynamic leadId: ${dynamicLeadId}`);
  } catch (err) {
    console.warn('⚠️ Failed to parse dynamic leadId from URL:', err.message);
  }

  // Step 9: Call Thank You URL
  const thankYouUrl = `https://www.fresh-tax-help.com/thankyou_ts_checklist.php?debt=${debtAmount}&leadid=${dynamicLeadId}&affid=${affid}&reqid=${dynamicReqId}&subid=#s1#`;
  console.log(`🔗 Calling Thank You URL: ${thankYouUrl}`);
  
  const thankYouResponse = await page.goto(thankYouUrl);
  if (thankYouResponse) {
    console.log(`✅ Thank You URL called, Status: ${thankYouResponse.status()}`);
  } else {
    console.log(`⚠️  Thank You URL returned null response`);
  }

  // Step 10: Prepare data for Google Sheets
  const sheetData = {
    dateTime: new Date().toISOString(),
    affiliate: affid,
    campaignId: dynamicReqId,
    trackingLink: finalPageUrl,
    sliderAmount: `$${debtAmount}`,
    state: state,
    leadId: dynamicLeadId,
    thankYouUrl: thankYouUrl,
    pageOrigin: 'fresh-tax-help',
    runDate: new Date().toLocaleDateString()
  };

  // Step 11: Append to Google Sheets (using default Sheet1 tab)
  console.log('📝 Appending data to Google Sheets...');
  const sheetResult = await appendRowByHeader('Sheet1', sheetData);
  
  if (sheetResult) {
    console.log('✅ Test completed successfully! All data logged.');
  } else {
    console.log('⚠️  Test completed but Google Sheets update failed.');
  }

  // Verify successful completion
  expect(thankYouResponse?.ok()).toBeTruthy();
});