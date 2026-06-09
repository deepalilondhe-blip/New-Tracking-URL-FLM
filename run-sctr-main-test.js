require('dotenv').config();
const { appendRowByHeader } = require('./utils/googleSheetsUtils.js');

async function runSCTRTest() {
    console.log('🚀 Starting SCTR-Main sheet creation and data entry...');
    
    const sheetName = 'SCTR-Main';
    
    const leadData = {
        dateTime: new Date().toISOString(),
        type: 'D',
        affiliate: '659',
        campaignId: '2432',
        trackingLink: 'https://secure-sctr.com/?a=659&oc=800&c=2432&s1=',
        sliderAmount: '9000',
        cakeIncome: '800',
        state: 'Arkansas',
        phone: '870-795-2371',
        leadId: 'TEST_LEAD_' + Date.now(),
        dbid: '',
        pageOrigin: '',
        thankYouUrl: '',
        cdbStatus: '',
        cdbEmail: 'ckmtestpixel@gmail.com',
        neustar: '',
        neustarDisposition: '',
        pixelFired: 'Yes',
        taxDebt: '9000',
        step1: '',
        step2: '',
        step3: '',
        step4: '',
        step5: '',
        step6: '',
        step7: '',
        step8: '',
        step9: '',
        step10: ''
    };

    console.log('\n📋 Lead Data:');
    console.log('First Name: ckmtestpixel');
    console.log('Last Name: ckmtestpixel');
    console.log('Email: ckmtestpixel@gmail.com');
    console.log('Phone: 870-795-2371');
    console.log('State: Arkansas');
    console.log('Slider Value: 9000');
    console.log('Device: Desktop');
    console.log('Tracking URL: https://secure-sctr.com/?a=659&oc=800&c=2432&s1=');
    
    console.log(`\n📝 Creating sheet "${sheetName}" and appending lead data...`);
    
    try {
        const result = await appendRowByHeader(sheetName, leadData);
        
        if (result) {
            console.log('\n✅ SUCCESS: Sheet created and data added successfully!');
            console.log('✅ All formatting applied (headers, colors, zebra striping, column widths)');
            console.log('✅ All changes have been applied correctly');
        } else {
            console.log('\n❌ FAILED: Could not complete operation');
            process.exit(1);
        }
        
    } catch (error) {
        console.error('\n❌ Error during execution:', error.message);
        process.exit(1);
    }
}

runSCTRTest();