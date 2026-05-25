const emailUtils = require('./utils/emailUtils');

async function testEmail() {
    console.log('🧪 Testing Auto-Evidence Emailing...');
    await emailUtils.sendFailureReport(
        'TEST-CAMPAIGN', 
        'Windows - Chrome', 
        'Mock error for testing email system',
        null, 
        null
    );
    console.log('🏁 Test completed. Check your inbox!');
}

testEmail();
