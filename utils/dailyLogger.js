const fs = require('fs');
const path = require('path');

/**
 * DAILY LOGGER: Accumulates all campaign results throughout the day.
 */
class DailyLogger {
    constructor() {
        this.logPath = path.join(__dirname, '..', 'logs', 'daily-results.json');
        this.ensureLogDir();
    }

    ensureLogDir() {
        const logDir = path.dirname(this.logPath);
        if (!fs.existsSync(logDir)) fs.mkdirSync(logDir, { recursive: true });
    }

    /**
     * Records a single run result to the daily log.
     */
    async logResult(result) {
        const data = this.readLog();
        const today = new Date().toISOString().split('T')[0];

        if (data.date !== today) {
            // Reset for a new day
            data.date = today;
            data.runs = [];
            data.emailSent = false;
        }

        data.runs.push({
            ...result,
            timestamp: new Date().toLocaleTimeString()
        });

        this.writeLog(data);
    }

    readLog() {
        if (fs.existsSync(this.logPath)) {
            try {
                return JSON.parse(fs.readFileSync(this.logPath, 'utf8'));
            } catch (e) {
                return { date: '', runs: [], emailSent: false };
            }
        }
        return { date: '', runs: [], emailSent: false };
    }

    writeLog(data) {
        fs.writeFileSync(this.logPath, JSON.stringify(data, null, 2));
    }

    getDailySummary() {
        const data = this.readLog();
        const total = data.runs.length;
        const succeeded = data.runs.filter(r => r.success).length;
        const failed = total - succeeded;
        
        // Extract unique failures for the summary
        const failureDetails = data.runs
            .filter(r => !r.success)
            .map(r => `${r.campaignId} [${r.label}]: ${r.error}`);

        return {
            total,
            succeeded,
            failed,
            failureDetails: [...new Set(failureDetails)],
            runs: data.runs,
            emailSent: data.emailSent
        };
    }

    markEmailSent() {
        const data = this.readLog();
        data.emailSent = true;
        this.writeLog(data);
    }
}

module.exports = new DailyLogger();
