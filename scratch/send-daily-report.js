const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });
const dailyLogger = require('../utils/dailyLogger');
const { sendProfessionalDailyReport } = require('../scheduler');

async function run() {
    console.log('🔄 Fetching daily summary from logs/daily-results.json...');
    const summary = dailyLogger.getDailySummary();
    console.log(`📊 Current Daily Summary: Total=${summary.total}, Succeeded=${summary.succeeded}, Failed=${summary.failed}`);
    
    console.log('📧 Dispatching daily report email now...');
    try {
        await sendProfessionalDailyReport(summary);
        console.log('✅ Email sent successfully!');
    } catch (err) {
        console.error('❌ Failed to send email:', err);
    }
}

run();
