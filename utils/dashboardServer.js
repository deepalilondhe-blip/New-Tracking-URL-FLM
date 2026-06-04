const http = require('http');
const fs = require('fs');
const path = require('path');
const url = require('url');
const { exec } = require('child_process');
require('dotenv').config();

const PORT = 3000;
const PUBLIC_DIR = path.join(__dirname, '..', 'public');
const HISTORY_FILE = path.join(__dirname, '..', 'config', 'chat-history.json');
const PROJECT_ROOT = path.join(__dirname, '..');

// Initialize chat history
let chatHistory = [];
if (fs.existsSync(HISTORY_FILE)) {
    try { chatHistory = JSON.parse(fs.readFileSync(HISTORY_FILE, 'utf8')); } catch (e) {}
}

function saveHistory(msg) {
    chatHistory.push(msg);
    if (chatHistory.length > 200) chatHistory.shift();
    try {
        const dir = path.dirname(HISTORY_FILE);
        if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
        fs.writeFileSync(HISTORY_FILE, JSON.stringify(chatHistory, null, 2));
    } catch (e) {
        console.warn('⚠️ Could not save chat history:', e.message);
    }
}

/**
 * MIME type resolver
 */
function getMimeType(filePath) {
    const ext = path.extname(filePath).toLowerCase();
    const mimeTypes = {
        '.html': 'text/html',
        '.css': 'text/css',
        '.js': 'application/javascript',
        '.json': 'application/json',
        '.png': 'image/png',
        '.jpg': 'image/jpeg',
        '.jpeg': 'image/jpeg',
        '.gif': 'image/gif',
        '.svg': 'image/svg+xml',
        '.ico': 'image/x-icon',
        '.webp': 'image/webp'
    };
    return mimeTypes[ext] || 'application/octet-stream';
}

/**
 * Load real-time stats for the dashboard
 */
function getStats() {
    let campaigns = [];
    let dailyResults = { date: 'N/A', runs: [], emailSent: false };
    let schedulerState = { completed: [] };

    try { campaigns = JSON.parse(fs.readFileSync(path.join(PROJECT_ROOT, 'config', 'campaigns.json'), 'utf8')); } catch (e) {}
    try { dailyResults = JSON.parse(fs.readFileSync(path.join(PROJECT_ROOT, 'logs', 'daily-results.json'), 'utf8')); } catch (e) {}
    try { schedulerState = JSON.parse(fs.readFileSync(path.join(PROJECT_ROOT, 'scheduler-state.json'), 'utf8')); } catch (e) {}

    const passed = dailyResults.runs.filter(r => r.success).length;
    const failed = dailyResults.runs.filter(r => !r.success).length;
    const total = dailyResults.runs.length;
    const rate = total > 0 ? ((passed / total) * 100).toFixed(1) : '100.0';

    return {
        totalCampaigns: campaigns.length,
        todayRuns: total,
        successRate: rate,
        passed,
        failed,
        date: dailyResults.date,
        emailSent: dailyResults.emailSent,
        completedState: schedulerState.completed.length,
        systemStatus: 'ONLINE'
    };
}

/**
 * Get campaign statuses
 */
function getCampaignStatuses() {
    let campaigns = [];
    let dailyResults = { runs: [] };
    let schedulerState = { completed: [] };

    try { campaigns = JSON.parse(fs.readFileSync(path.join(PROJECT_ROOT, 'config', 'campaigns.json'), 'utf8')); } catch (e) {}
    try { dailyResults = JSON.parse(fs.readFileSync(path.join(PROJECT_ROOT, 'logs', 'daily-results.json'), 'utf8')); } catch (e) {}
    try { schedulerState = JSON.parse(fs.readFileSync(path.join(PROJECT_ROOT, 'scheduler-state.json'), 'utf8')); } catch (e) {}

    return campaigns.map(c => {
        const runs = dailyResults.runs.filter(r => r.campaignId === c.id);
        const passed = runs.filter(r => r.success).length;
        const failed = runs.filter(r => !r.success).length;
        const completedEnvs = schedulerState.completed.filter(s => s.startsWith(c.id + ':'));
        const lastRun = runs.length > 0 ? runs[runs.length - 1] : null;

        return {
            id: c.id,
            name: c.name,
            sheet: c.sheet,
            url: c.url,
            todayRuns: runs.length,
            passed,
            failed,
            completedEnvs: completedEnvs.length,
            totalEnvs: 10,
            lastRunTime: lastRun ? lastRun.timestamp : 'N/A',
            status: failed > 0 ? 'FAIL' : (runs.length > 0 ? 'PASS' : 'PENDING')
        };
    });
}

/**
 * Get recent logs
 */
function getRecentLogs(filter = 'all', maxLines = 100) {
    try {
        const logDir = path.join(PROJECT_ROOT, 'logs', 'scheduler');
        const files = fs.readdirSync(logDir).filter(f => f.endsWith('.log')).sort().reverse();
        if (files.length === 0) return [];

        const content = fs.readFileSync(path.join(logDir, files[0]), 'utf8');
        let lines = content.split('\n').filter(l => l.trim());

        if (filter === 'errors') {
            lines = lines.filter(l => l.includes('❌') || l.includes('FAIL') || l.includes('Error') || l.includes('⚠️'));
        }

        return lines.slice(-maxLines);
    } catch (e) {
        return ['No logs available.'];
    }
}

// ================================================================
// HTTP SERVER
// ================================================================
const server = http.createServer((req, res) => {
    const parsedUrl = url.parse(req.url, true);

    // CORS headers
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') {
        res.writeHead(200);
        res.end();
        return;
    }

    // ===== API: GET CHAT HISTORY =====
    if (req.method === 'GET' && parsedUrl.pathname === '/api/history') {
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ history: chatHistory }));
        return;
    }

    // ===== API: GET STATS =====
    if (req.method === 'GET' && parsedUrl.pathname === '/api/stats') {
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify(getStats()));
        return;
    }

    // ===== API: GET CAMPAIGNS =====
    if (req.method === 'GET' && parsedUrl.pathname === '/api/campaigns') {
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify(getCampaignStatuses()));
        return;
    }

    // ===== API: GET LOGS =====
    if (req.method === 'GET' && parsedUrl.pathname === '/api/logs') {
        const filter = parsedUrl.query.filter || 'all';
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ logs: getRecentLogs(filter) }));
        return;
    }

    // ===== API: CHAT (POST) =====
    if (req.method === 'POST' && parsedUrl.pathname === '/api/chat') {
        let body = '';
        req.on('data', chunk => { body += chunk.toString(); });
        req.on('end', async () => {
            try {
                const data = JSON.parse(body);
                const prompt = data.message || '';
                const hasImage = !!data.image;

                // Save user message
                saveHistory({ role: 'user', message: prompt, hasImage, timestamp: new Date().toLocaleTimeString() });

                console.log(`🤖 [Agent] Processing: "${prompt}" ${hasImage ? '[WITH IMAGE]' : ''}`);

                const flmAgent = require('./flmAgent');
                let response = await flmAgent.processPrompt(prompt, hasImage);

                // Save agent response
                saveHistory({ role: 'agent', message: response, timestamp: new Date().toLocaleTimeString() });

                // Execute "run" commands in background
                const msg = prompt.toLowerCase();
                if (msg.includes('run')) {
                    let campaigns = [];
                    try { campaigns = JSON.parse(fs.readFileSync(path.join(PROJECT_ROOT, 'config', 'campaigns.json'), 'utf8')); } catch (e) {}

                    let targetCampaign = null;
                    for (const c of campaigns) {
                        if (msg.includes(c.id.toLowerCase()) || msg.includes(c.name.toLowerCase().split(' ')[0].toLowerCase())) {
                            targetCampaign = c;
                            break;
                        }
                    }

                    const isHeaded = !msg.includes('headless');
                    const env = { ...process.env, HEADLESS: isHeaded ? 'false' : 'true' };

                    if (targetCampaign) {
                        const isMultiDevice = msg.includes('3 device') || msg.includes('multi') || msg.includes('all device');

                        if (isMultiDevice) {
                            ['desktop', 'mobile', 'tablet'].forEach(v => {
                                exec(`node run-master.js --campaign "${targetCampaign.id}" --viewport "${v}"`, { cwd: PROJECT_ROOT, env });
                            });
                        } else {
                            const viewport = msg.includes('mobile') ? 'mobile' : msg.includes('tablet') ? 'tablet' : 'desktop';
                            exec(`node run-master.js --campaign "${targetCampaign.id}" --viewport "${viewport}"`, { cwd: PROJECT_ROOT, env });
                        }
                    } else if (msg.includes('all') || msg.includes('everything') || msg.includes('full')) {
                        exec(`node scheduler.js --once`, { cwd: PROJECT_ROOT, env });
                    }
                }

                res.writeHead(200, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ response }));
            } catch (err) {
                console.error('❌ Chat API error:', err.message);
                res.writeHead(500, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ response: '❌ An error occurred processing your request. Please try again.' }));
            }
        });
        return;
    }

    // ===== STATIC FILE SERVING =====
    let filePath;
    if (parsedUrl.pathname === '/') {
        filePath = path.join(PUBLIC_DIR, 'agent-dashboard.html');
    } else if (parsedUrl.pathname === '/chat' || parsedUrl.pathname === '/chat/') {
        filePath = path.join(PUBLIC_DIR, 'chat.html');
    } else {
        filePath = path.join(PUBLIC_DIR, parsedUrl.pathname);
    }

    fs.readFile(filePath, (err, content) => {
        if (err) {
            res.writeHead(404);
            res.end('404 Not Found');
            return;
        }
        res.writeHead(200, { 'Content-Type': getMimeType(filePath) });
        res.end(content);
    });
});

server.listen(PORT, () => {
    console.log(`\n🚀 ================================================================`);
    console.log(`🚀 FLM AGENT COMMAND CENTER v3.0 IS ONLINE`);
    console.log(`🚀 URL: http://localhost:${PORT}`);
    console.log(`🚀 APIs: /api/chat, /api/stats, /api/campaigns, /api/logs, /api/history`);
    console.log(`🚀 ================================================================`);
});
