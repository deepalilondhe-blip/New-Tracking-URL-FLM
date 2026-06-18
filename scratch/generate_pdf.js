const { chromium } = require('playwright');
const path = require('path');

(async () => {
  try {
    console.log('🚀 Starting PDF generation using Playwright...');
    const browser = await chromium.launch({ headless: true });
    const page = await browser.newPage();

    const htmlPath = path.join(__dirname, 'qa_scope.html');
    const pdfOutputPath = path.join(__dirname, '..', 'GlobeWest_QA_Tester_Scope_Updated.pdf');

    console.log(`Loading HTML file: ${htmlPath}`);
    await page.goto(`file://${htmlPath}`, { waitUntil: 'networkidle' });

    // Wait a couple of seconds to ensure external web fonts (Outfit from Google Fonts) are fully loaded
    await page.waitForTimeout(2000);

    console.log(`Generating PDF file: ${pdfOutputPath}`);
    await page.pdf({
      path: pdfOutputPath,
      format: 'A4',
      printBackground: true,
      margin: {
        top: '15mm',
        bottom: '15mm',
        left: '15mm',
        right: '15mm'
      }
    });

    console.log('✅ PDF generated successfully!');
    await browser.close();
  } catch (error) {
    console.error('❌ Error generating PDF:', error.message);
    process.exit(1);
  }
})();
