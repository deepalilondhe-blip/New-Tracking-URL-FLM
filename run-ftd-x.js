const { chromium } = require('playwright');
const FormPage = require('./pages/FormPage');
const { processLead } = require('./utils/leadProcessor');
const { appendRowByHeader } = require('./utils/googleSheetsUtils');
const path = require('path');
const fs = require('fs');

console.log('✅ Running FTD-X with Video & Trace Recording...');
console.log('✅ Tracking URL: https://mlfftd.com/?a=659&oc=656&c=167&s1=');
console.log('✅ Sheet Name: FTD-X');

(async () => {
    // Create traces directory if it doesn't exist
    const traceDir = path.join(__dirname, 'traces');
    if (!fs.existsSync(traceDir)) fs.mkdirSync(traceDir);

    const browser = await chromium.launch({ headless: false, slowMo: 800, channel: 'msedge' });

    // Create a context with video recording enabled
    const context = await browser.newContext({
        recordVideo: { dir: 'traces/videos/' }
    });

    // Start tracing to capture screenshots and DOM snapshots
    await context.tracing.start({ screenshots: true, snapshots: true, sources: true });

    const page = await context.newPage();

    try {
        const brand = {
            name: "FTD-X",
            url: "https://mlfftd.com/?a=659&oc=656&c=167&s1=",
            sheet: "FTD-X",
            sliderAmount: "12,000",
            state: "Colorado",
            firstName: "ckmtestpixel",
            lastName: "ckmtestpixel",
            email: "ckmtestpixel@gmail.com",
            phone: "720-456-5452"
        };

        const result = await processLead(brand, page);
        console.log('✅ FTD-X Test completed:', result);
        
        // Extract Thank You URL from current page
        const thankYouUrl = page.url();
        console.log('✅ Extracted Thank You URL:', thankYouUrl);
        
        // Extract Lead ID from Thank You URL
        let leadId = '';
        const leadIdMatch = thankYouUrl.match(/leadid=([^&]+)/);
        if (leadIdMatch) {
            leadId = leadIdMatch[1];
            console.log('✅ Extracted Lead ID:', leadId);
        }
        
        // Append lead data to Google Sheet (always append even if result is undefined)
        const leadData = result || {};
        leadData.dateTime = new Date().toISOString();
        leadData.type = "Windows - Firefox";
        leadData.affiliate = "659";
        leadData.campaignId = "656";
        leadData.trackingLink = brand.url;
        leadData.sliderAmount = brand.sliderAmount;
        leadData.cakeIncome = "12000";
        leadData.state = brand.state;
        leadData.phone = brand.phone;
        leadData.leadId = leadId;
        leadData.firstName = brand.firstName;
        leadData.lastName = brand.lastName;
        leadData.email = brand.email;
        leadData.thankYouUrl = thankYouUrl;
        leadData.pageOrigin = thankYouUrl;
        leadData.step1 = "Step 1";
        leadData.step2 = "Step 2";
        leadData.step3 = brand.state;
        
        console.log('📝 Writing lead data to Google Sheet...');
        const sheetResult = await appendRowByHeader(brand.sheet, leadData);
        
        if (sheetResult) {
            console.log('✅ Lead data successfully appended to Google Sheet!');
        } else {
            console.log('❌ Failed to append lead data to Google Sheet');
        }

        // Stop tracing and save to zip file
        await context.tracing.stop({ path: path.join(traceDir, 'FTD_X_Desktop.zip') });
        console.log(`\n📋 Trace Report saved to: traces/FTD_X_Desktop.zip`);

    } catch (error) {
        console.error('❌ FTD-X Test failed:', error);
    } finally {
        await page.waitForTimeout(3000);
        await browser.close();
    }
})();
