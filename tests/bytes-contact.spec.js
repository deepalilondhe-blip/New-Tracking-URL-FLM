const { test, expect } = require('@playwright/test');
const AxeBuilder = require('@axe-core/playwright').default;

test('Test Bytes Technolab Contact Page Accessibility', async ({ page }) => {
  // Go to the Contact Us page
  await page.goto('https://www.bytestechnolab.com/contact-us/');

  // Wait for the main body/content to load
  await page.waitForLoadState('networkidle');

  console.log('Waiting 5 seconds in headed mode to let you watch...');
  await page.waitForTimeout(5000);

  // Run the accessibility scan
  const accessibilityScanResults = await new AxeBuilder({ page }).analyze();

  // Print violations to the console so we can see what failed
  if (accessibilityScanResults.violations.length > 0) {
    console.log('🛑 Accessibility Violations Detected:');
    accessibilityScanResults.violations.forEach((violation, index) => {
      console.log(`\n${index + 1}. [${violation.id}] - ${violation.help}`);
      console.log(`   Impact: ${violation.impact}`);
      console.log(`   Element Selector(s):`);
      violation.nodes.forEach(node => {
        console.log(`     - ${node.target.join(', ')}`);
        console.log(`       HTML: ${node.html}`);
      });
    });
  } else {
    console.log('✅ No accessibility violations found!');
  }

  // Assert there are no violations
  expect(accessibilityScanResults.violations).toEqual([]);
});
