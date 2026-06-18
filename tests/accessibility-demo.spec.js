const { test, expect } = require('@playwright/test');
const AxeBuilder = require('@axe-core/playwright').default;

test('Test Google Accessibility', async ({ page }) => {
  // Go to Google (which has some minor accessibility errors we can detect)
  await page.goto('https://www.google.com');

  console.log('Waiting 5 seconds in headed mode to let you watch...');
  await page.waitForTimeout(5000);

  // Run the accessibility scan
  const accessibilityScanResults = await new AxeBuilder({ page }).analyze();

  // Assert that there are no violations.
  // This will fail because Google has minor violations, allowing you to see the error report!
  expect(accessibilityScanResults.violations).toEqual([]);
});
