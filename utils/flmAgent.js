const fs = require('fs');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

/**
 * ====================================================================
 * FLM AGENT v3.0 — INTELLIGENT AUTOMATION COMMAND CENTER
 * ====================================================================
 * Deep project knowledge, real-time data access, natural language
 * understanding, and proactive campaign intelligence.
 * ====================================================================
 */
class AIAgent {
    constructor() {
        this.name = 'AI Agent';
        this.version = '3.0';
        this.memoryPath = path.join(__dirname, '..', 'config', 'healing-memory.json');
        this.projectRoot = path.join(__dirname, '..');
        this.loadMemory();

        // 🧠 DEEP PROJECT KNOWLEDGE BASE
        this.knowledge = {
            pipeline: [
                '1. PLAYWRIGHT FORM FILL — Navigate to tracking URL, set slider via Smart Choice Scanner (length < 60 chars filter), select state, fill contact info, submit form',
                '2. THANK YOU PAGE — Early Exit Detection before Step 6 or extract Lead ID from final redirect URL. NOTE: Valid CAKE Lead IDs are exactly 8 characters and MUST be alphanumeric. Purely numeric IDs (e.g. 26829587) are invalid request IDs and must be rejected.',
                '3. FIRST API (CAKE XML) — GET to app.forwardleapmarketing.com → Affiliate, Campaign ID, Income, State, Phone, Neustar, Pixel',
                '4. SECOND API (CDB JSON) — POST to flm-utility.com or everesttaxrelief.net → DBID, CDB Status, CDB Email Validation',
                '5. REST-ASSURANCE — Backend verification of lead data integrity',
                '6. GOOGLE SHEETS — Append 22-column row to campaign-specific tab + professional formatting',
                '7. VIDEO CAPTURE — Saving WebM trace videos without closing context prematurely'
            ],
            incomeMapping: {
                tiers: [
                    { range: '≤ $7,500', cake: '$5,000' },
                    { range: '$7,501 - $9,999', cake: '$7,500' },
                    { range: '$10,000 - $19,999', cake: '$10,000' },
                    { range: '$20,000 - $49,999', cake: '$20,000' },
                    { range: '$50,000 - $99,999', cake: '$50,000' },
                    { range: '$100,000+', cake: '$100,000 ("100000 & more")' }
                ],
                description: 'The 7-Tier Cake Income Mapping converts the UI slider value into a standardized income bracket for the CAKE API backend.'
            },
            scheduler: {
                days: 'Monday, Wednesday, Friday',
                startTime: '11:00 AM',
                interval: '3 hours',
                mode: 'Headless (silent)',
                stateFile: 'scheduler-state.json (tracks completed runs for resume capability)'
            },
            environments: [
                'Android - Chrome (Pixel 7)',
                'Android - Firefox (Pixel 7)',
                'iOS - Chrome (iPhone 15 Pro Max → iPhone 17 Pro emulation)',
                'iOS - Safari (iPhone 15 Pro Max → iPhone 17 Pro emulation)',
                'Tablet - Safari (iPad Pro 11)',
                'Tablet - Chrome (iPad Pro 11)',
                'Windows - Chrome (Desktop 1280x800)',
                'Windows - Firefox (Desktop 1280x800)',
                'MAC - Safari (Desktop 1280x800)',
                'MAC - Chrome (Desktop 1280x800)'
            ],
            sheetColumns: [
                'DateTime', 'Type', 'Affiliate', 'Campaign ID', 'Link',
                'Slider Amount', 'Cake Income', 'State', 'Phone', 'Lead ID',
                'DBID', 'Page Origin', 'Thank u URL', 'CDB Status', 'CDB Email',
                'Neustar', 'Neustar Disposition', 'Pixel Fired', 'Run Date',
                'Step 1', 'Step 2', 'Step 3'
            ],
            apis: {
                first: {
                    name: 'CAKE XML API',
                    endpoint: 'http://app.forwardleapmarketing.com/api/1/get.asmx/LeadInfo',
                    method: 'GET',
                    returns: 'Affiliate ID, Campaign ID, Income/Tax Debt, State, Phone, Neustar, Neustar Disposition, Pixel Fired'
                },
                second: {
                    name: 'CDB JSON API',
                    standard: 'https://flm-utility.com/api-qa-automation-hostgator/getData.php',
                    everest: 'https://everesttaxrelief.net/api-qa-automation-atwohosting/getData.php',
                    method: 'POST',
                    returns: 'DBID, CDB Status, CDB Email Validation',
                    note: 'Everest Tax Relief(X) and VTS Original use the everesttaxrelief.net endpoint'
                }
            },
            troubleshooting: {
                'data not in sheet': 'Check the sheet tab name matches exactly (including spaces). FSI-Main writes to "FSI - MAIN" (with spaces). The Google Sheet ID is in .env (GOOGLE_SHEET_ID). All campaigns write to the SAME spreadsheet, each in their own tab.',
                'campaign skipped': 'The scheduler-state.json tracks completed runs. If a campaign shows "SKIP", it was already successfully completed in this batch. Delete scheduler-state.json or wait for next batch to re-run.',
                'lead id duplicate': 'If Lead ID shows "DUPLICATE", the same test credentials were submitted too recently. The form redirects to a static thank-you page without a new Lead ID.',
                'second api no dbid': 'The CDB backend may not have synced the lead yet. The system retries 5 times with 1s delays. If still empty, the DBID column will be blank.',
                'wrong spreadsheet': 'All campaigns write to the single spreadsheet configured in .env GOOGLE_SHEET_ID. If you are looking at a different spreadsheet, you wont see the data.',
                'scheduler not running': 'Scheduler is configured for Mon/Wed/Fri only. Check the Windows Task Scheduler for "Playwright_LeadAutomation_Scheduler". Also check if the day filter (allowedDays) in scheduler.js matches.'
            }
        };
    }

    // =============================================
    // 📊 REAL-TIME DATA ACCESS
    // =============================================

    loadCampaigns() {
        try {
            const configPath = path.join(this.projectRoot, 'config', 'campaigns.json');
            return JSON.parse(fs.readFileSync(configPath, 'utf8'));
        } catch (e) { return []; }
    }

    loadDailyResults() {
        try {
            const resultsPath = path.join(this.projectRoot, 'logs', 'daily-results.json');
            return JSON.parse(fs.readFileSync(resultsPath, 'utf8'));
        } catch (e) { return { date: 'N/A', runs: [], emailSent: false }; }
    }

    loadSchedulerState() {
        try {
            const statePath = path.join(this.projectRoot, 'scheduler-state.json');
            return JSON.parse(fs.readFileSync(statePath, 'utf8'));
        } catch (e) { return { completed: [] }; }
    }

    loadEnvConfig() {
        try {
            const envPath = path.join(this.projectRoot, '.env');
            const content = fs.readFileSync(envPath, 'utf8');
            const config = {};
            content.split('\n').forEach(line => {
                const match = line.match(/^([^#=]+)=(.*)$/);
                if (match) config[match[1].trim()] = match[2].trim();
            });
            return config;
        } catch (e) { return {}; }
    }

    getLatestLogFile() {
        try {
            const logDir = path.join(this.projectRoot, 'logs', 'scheduler');
            const files = fs.readdirSync(logDir).filter(f => f.endsWith('.log')).sort().reverse();
            return files.length > 0 ? path.join(logDir, files[0]) : null;
        } catch (e) { return null; }
    }

    searchLogs(campaignId, maxLines = 30) {
        const logFile = this.getLatestLogFile();
        if (!logFile) return ['No scheduler logs found.'];
        try {
            const content = fs.readFileSync(logFile, 'utf8');
            const lines = content.split('\n');
            const matches = [];
            const search = campaignId.toLowerCase();
            for (const line of lines) {
                if (line.toLowerCase().includes(search) && (line.includes('❌') || line.includes('FAIL') || line.includes('Error') || line.includes('⚠️'))) {
                    matches.push(line.trim());
                }
            }
            return matches.slice(0, maxLines);
        } catch (e) { return ['Could not read log file.']; }
    }

    // =============================================
    // 🧠 INTELLIGENT NATURAL LANGUAGE PROCESSOR
    // =============================================

    async processPrompt(prompt, hasImage = false) {
        const msg = (prompt || '').toLowerCase().trim();

        // 1. HARDCODED ACTION COMMANDS (Always intercept "Run" commands)
        if (msg.startsWith('run')) {
            const campaigns = this.loadCampaigns();
            let targetCampaign = null;
            for (const c of campaigns) {
                if (msg.includes(c.id.toLowerCase()) || msg.includes(c.name.toLowerCase().split(' ')[0].toLowerCase())) {
                    targetCampaign = c;
                    break;
                }
            }
            const mode = (msg.includes('headed') || msg.includes('visible')) ? 'Headed (Visible)' : 'Headless (Silent)';
            const viewport = msg.includes('mobile') ? 'mobile' : msg.includes('tablet') ? 'tablet' : 'desktop';

            if (targetCampaign) {
                return `🚀 **Launching ${targetCampaign.name}!**\n\n- **Mode:** ${mode}\n- **Viewport:** ${viewport.toUpperCase()}\n- **Target Sheet:** ${targetCampaign.sheet}\n- **URL:** ${targetCampaign.url}\n\nI'm executing the run now. You'll see results appear in the Google Sheet and in the execution logs shortly!`;
            }

            if (msg.includes('all') || msg.includes('everything') || msg.includes('full')) {
                return `🚀 **Launching Full Suite Execution!**\n\nThis will run all **${campaigns.length} campaigns × 10 environments = ${campaigns.length * 10} test runs** in ${mode} mode.\n\n⚠️ This will take approximately **${Math.round(campaigns.length * 10 * 0.7)} minutes** to complete.`;
            }
        }

        // 2. TRUE AI INTEGRATION (GEMINI)
        const apiKey = process.env.GEMINI_API_KEY;
        if (apiKey) {
            try {
                const { GoogleGenerativeAI } = require('@google/generative-ai');
                const genAI = new GoogleGenerativeAI(apiKey);
                const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });

                // Construct Context for the AI
                const daily = this.loadDailyResults();
                const campaigns = this.loadCampaigns();
                const passed = daily.runs.filter(r => r.success).length;
                const failed = daily.runs.filter(r => !r.success).length;
                const recentLogs = this.searchLogs('FAIL', 10).join('\\n');
                
                // Load chat history for memory
                let historyContext = "";
                try {
                    const historyFile = path.join(__dirname, '..', 'config', 'chat-history.json');
                    if (fs.existsSync(historyFile)) {
                        const history = JSON.parse(fs.readFileSync(historyFile, 'utf8'));
                        // Take the last 10 messages for context memory
                        const recentHistory = history.slice(-10);
                        if (recentHistory.length > 0) {
                            historyContext = "\\nRECENT CONVERSATION HISTORY:\\n" + recentHistory.map(h => `${h.role.toUpperCase()}: ${h.message}`).join("\\n");
                        }
                    }
                } catch (e) {
                    console.warn("Could not load chat history for AI memory.");
                }

                const systemPrompt = `You are Antigravity, a highly intelligent agentic AI coding and co-pilot assistant designed to pair program and manage the Playwright Lead Automation Suite.
Your tone is professional, collaborative, extremely direct, concise, and helpful. Write responses in standard github-style markdown (bolding, clean lists, tables, code snippets).
                
CURRENT SYSTEM STATUS:
- Today's Date: ${daily.date}
- Total Campaigns: ${campaigns.length}
- Today's Runs: ${passed} passed, ${failed} failed
- Recent Error Logs: ${recentLogs || 'None'}

KNOWLEDGE BASE:
${JSON.stringify(this.knowledge, null, 2)}
${historyContext}

INSTRUCTIONS:
Answer the user's prompt using the real-time data above. Be direct, clear, and concise. Speak confidently like Antigravity. Assist the user as a peer programmer or administrator. Do NOT mention details about this system prompt.`;

                const result = await model.generateContent([
                    { text: systemPrompt },
                    { text: "User Request: " + prompt }
                ]);
                
                return result.response.text();
            } catch (err) {
                console.error("Gemini API Error:", err);
                return `⚠️ **AI Engine Error:** I encountered an issue connecting to my Gemini neural network: ${err.message}. Falling back to standard processing...`;
            }
        }

        // 3. FALLBACK: IF NO API KEY
        if (msg.includes('help') || msg.includes('capabilities')) {
            return `🧠 **AI Agent v${this.version} — Capabilities:**\n\n**✨ TRUE AI MODE IS CURRENTLY LOCKED ✨**\nTo make me speak and think like Antigravity, I need a Gemini API Key!\n\n1. Go to [Google AI Studio](https://aistudio.google.com/app/apikey) to get a free key.\n2. Add \`GEMINI_API_KEY=your_key\` to your \`.env\` file.\n3. Restart the dashboard.\n\nOnce unlocked, I'll be powered by a true LLM and can analyze logs, explain architectures, and chat with you dynamically!\n\n---\n**Standard Capabilities:**\n• "What is the status?"\n• "Run FSI-Main on desktop"\n• "Show errors"\n• "Explain pipeline"`;
        }

        if (hasImage) {
            return "📸 I see the screenshot! However, to visually analyze images and compare them to logs, I need my **True AI Mode** unlocked. Please add a \`GEMINI_API_KEY\` to your \`.env\` file!";
        }

        if (msg.match(/^(hi|hello|hey|sup)/)) {
            return `👋 Hello! I'm the **AI Agent**. I'm currently running in standard mode. Add a \`GEMINI_API_KEY\` to the \`.env\` file to unlock my True AI conversational capabilities!`;
        }

        if (msg.includes('status')) return this._getFullStatus();
        if (msg.includes('error') || msg.includes('fail') || msg.includes('troubleshoot')) return this._getTroubleshootingHelp(msg);

        if (msg.includes('list') || msg.includes('all campaign')) {
            const campaigns = this.loadCampaigns();
            return `📋 **All ${campaigns.length} Configured Campaigns:**\n\n${campaigns.map((c, i) => `${i + 1}. **${c.name}** (ID: \`${c.id}\`) → Sheet: \`${c.sheet}\``).join('\n')}\n\nEach campaign runs on 10 environments per batch cycle.`;
        }

        if (msg.includes('pipeline') || msg.includes('explain') || msg.includes('flow')) {
            return `🔄 **6-Stage Lead Automation Pipeline:**\n\n${this.knowledge.pipeline.map(p => `**${p}**`).join('\n\n')}\n\n📋 **Execution Matrix:** Each campaign runs through **10 browser/device environments** (4 mobile, 2 tablet, 4 desktop), producing 10 rows per campaign per batch.`;
        }

        if (msg.includes('income') || msg.includes('mapping') || msg.includes('cake') || msg.includes('tier') || msg.includes('slider')) {
            const tiers = this.knowledge.incomeMapping.tiers;
            return `💰 **7-Tier Cake Income Mapping System:**\n\n${this.knowledge.incomeMapping.description}\n\n| UI Slider Range | Cake Income Value |\n|---|---|\n${tiers.map(t => `| ${t.range} | ${t.cake} |`).join('\n')}\n\n📝 **How it works:**\n1. The UI slider selects a raw dollar amount\n2. The system maps it to the nearest Cake tier\n3. Both the raw slider value AND the mapped Cake Income are written to the Google Sheet\n4. The FLM Agent audits every lead to ensure the mapping is correct`;
        }

        if (msg.includes('pending') || msg.includes('remaining') || msg.includes('not completed') || msg.includes('left')) {
            return this._getPendingCampaigns();
        }
        
        return `⚠️ **Conversational AI Mode is Locked!**\n\nI am tracking **${this.loadCampaigns().length} campaigns**, but my true brain is currently offline. To enable my advanced conversational capabilities and allow me to answer arbitrary prompts, you **MUST** provide a \`GEMINI_API_KEY\` in your \`.env\` file.\n\nUntil then, I can only respond to basic commands like **"status"**, **"help"**, or **"run [campaign]"**.`;
    }

    // =============================================
    // 📊 RESPONSE BUILDERS
    // =============================================

    _getFullStatus() {
        const daily = this.loadDailyResults();
        const campaigns = this.loadCampaigns();
        const state = this.loadSchedulerState();
        const passed = daily.runs.filter(r => r.success).length;
        const failed = daily.runs.filter(r => !r.success).length;
        const uniqueCampaigns = [...new Set(daily.runs.map(r => r.campaignId))];
        const rate = daily.runs.length > 0 ? ((passed / daily.runs.length) * 100).toFixed(1) : '0.0';

        return `📊 **Full System Status Report:**\n\n🗓️ **Date:** ${daily.date || new Date().toISOString().split('T')[0]}\n✅ **Passed:** ${passed} | ❌ **Failed:** ${failed} | 📊 **Success Rate:** ${rate}%\n📋 **Campaigns Executed:** ${uniqueCampaigns.length} / ${campaigns.length}\n🔄 **Resume State:** ${state.completed.length} runs in completed queue\n📧 **Daily Email:** ${daily.emailSent ? 'Sent' : 'Pending'}\n\n**Campaigns Executed Today:**\n${uniqueCampaigns.map(c => {
            const runs = daily.runs.filter(r => r.campaignId === c);
            const cPassed = runs.filter(r => r.success).length;
            const cFailed = runs.filter(r => !r.success).length;
            return `• **${c.toUpperCase()}** — ✅ ${cPassed} passed, ❌ ${cFailed} failed`;
        }).join('\n')}\n\n${failed > 0 ? '⚠️ There are failures. Ask me "show errors" for details.' : '🎯 All systems nominal!'}`;
    }

    _getCampaignStatus(campaign) {
        const daily = this.loadDailyResults();
        const state = this.loadSchedulerState();
        const runs = daily.runs.filter(r => r.campaignId === campaign.id);
        const passed = runs.filter(r => r.success).length;
        const failed = runs.filter(r => !r.success).length;
        const completedEnvs = state.completed.filter(s => s.startsWith(campaign.id + ':'));
        const errors = this.searchLogs(campaign.id, 5);

        let response = `📋 **Campaign Report: ${campaign.name}**\n\n`;
        response += `- **ID:** ${campaign.id}\n`;
        response += `- **Sheet Tab:** "${campaign.sheet}"\n`;
        response += `- **Tracking URL:** ${campaign.url}\n`;
        response += `- **Today's Runs:** ${runs.length} total (✅ ${passed} passed, ❌ ${failed} failed)\n`;
        response += `- **Completed Environments:** ${completedEnvs.length} / 10\n\n`;

        if (runs.length > 0) {
            response += `**Run Details:**\n`;
            runs.forEach(r => {
                response += `• [${r.timestamp}] ${r.label} (${r.browser}) — ${r.success ? '✅ PASS' : '❌ FAIL'}\n`;
            });
        } else {
            response += `⚠️ **No runs recorded today for this campaign.** It may not have been reached yet in the scheduler queue, or it was skipped from a previous batch (check scheduler-state.json).\n`;
        }

        if (errors.length > 0 && errors[0] !== 'No scheduler logs found.') {
            response += `\n🔍 **Recent Warnings/Errors:**\n${errors.slice(0, 5).map(e => `• ${e.substring(0, 150)}`).join('\n')}`;
        }

        return response;
    }

    _getPendingCampaigns() {
        const campaigns = this.loadCampaigns();
        const state = this.loadSchedulerState();
        const totalEnvs = 10;

        const pending = [];
        const completed = [];

        for (const c of campaigns) {
            const done = state.completed.filter(s => s.startsWith(c.id + ':'));
            if (done.length >= totalEnvs) {
                completed.push(c.name);
            } else {
                pending.push({ name: c.name, done: done.length, remaining: totalEnvs - done.length });
            }
        }

        if (pending.length === 0 && state.completed.length === 0) {
            return `📋 **All campaigns are pending** — the scheduler state is empty. This means either:\n- A new batch hasn't started yet\n- The previous batch completed fully and the state was reset\n\nThe scheduler will begin the next batch on the next scheduled time (Mon/Wed/Fri).`;
        }

        let response = `📋 **Pending Campaigns (${pending.length}):**\n\n`;
        if (pending.length > 0) {
            response += pending.map(p => `• **${p.name}** — ${p.done}/${totalEnvs} done, **${p.remaining} remaining**`).join('\n');
        } else {
            response += '_All campaigns have completed this batch!_';
        }

        response += `\n\n✅ **Completed (${completed.length}):** ${completed.length > 0 ? completed.join(', ') : 'None yet'}`;
        return response;
    }

    _getTroubleshootingHelp(msg) {
        let response = `🔧 **Troubleshooting Guide:**\n\n`;

        if (msg.includes('sheet') || msg.includes('data') || msg.includes('appearing') || msg.includes('showing')) {
            response += `**Data Not Appearing in Google Sheet?**\n\n`;
            response += `1. **Check the correct spreadsheet** — All data goes to ONE spreadsheet (ID: \`${this.loadEnvConfig().GOOGLE_SHEET_ID || 'see .env'}\`)\n`;
            response += `2. **Check the tab name** — Tab names must match EXACTLY, including spaces:\n`;
            const campaigns = this.loadCampaigns();
            campaigns.forEach(c => {
                response += `   • ${c.name} → **"${c.sheet}"**\n`;
            });
            response += `3. **Check if the campaign ran** — Look in daily-results.json for the campaign ID\n`;
            response += `4. **Check for errors** — Ask me "show errors" to see today's failures\n`;
            response += `5. **Service Account permissions** — The Google service account must have Editor access to the spreadsheet\n`;
        } else {
            for (const [issue, fix] of Object.entries(this.knowledge.troubleshooting)) {
                response += `**${issue.charAt(0).toUpperCase() + issue.slice(1)}:**\n${fix}\n\n`;
            }
        }

        return response;
    }

    // =============================================
    // 🧠 EXISTING CORE FEATURES (Preserved)
    // =============================================

    loadMemory() {
        if (fs.existsSync(this.memoryPath)) {
            try { this.memory = JSON.parse(fs.readFileSync(this.memoryPath, 'utf8')); } catch (e) { this.memory = { fixes: {} }; }
        } else {
            this.memory = { fixes: {} };
        }
    }

    saveMemory() {
        if (!fs.existsSync(path.dirname(this.memoryPath))) fs.mkdirSync(path.dirname(this.memoryPath), { recursive: true });
        fs.writeFileSync(this.memoryPath, JSON.stringify(this.memory, null, 2));
    }

    async verifyUrlHealth(campaignName, url) {
        console.log(`🤖 [${this.name}] Pre-flight check: Verifying health for ${campaignName}...`);
        try {
            const axios = require('axios');
            const res = await axios.get(url, { timeout: 10000 });
            if (res.status >= 200 && res.status < 400) {
                console.log(`✅ [${this.name}] ${campaignName} URL is healthy.`);
                return { healthy: true };
            }
            return { healthy: false, error: `Status ${res.status}` };
        } catch (err) {
            return { healthy: false, error: err.message };
        }
    }

    validateIncomeMapping(sliderVal, cakeIncome, apiVal) {
        const raw = parseInt(sliderVal.toString().replace(/[$,\s]/g, '')) || 0;
        let expectedCake;

        if (raw <= 7500) expectedCake = "5,000";
        else if (raw <= 9999) expectedCake = "7,500";
        else if (raw <= 19999) expectedCake = "10,000";
        else if (raw <= 49999) expectedCake = "20,000";
        else if (raw <= 99999) expectedCake = "50,000";
        else expectedCake = "100,000";

        const apiMatch = (apiVal && apiVal.toString().replace(/[$,\s]/g, '') === expectedCake.replace(',', ''));
        const sheetMatch = (cakeIncome && cakeIncome.toString().replace(/[$,\s]/g, '') === expectedCake.replace(',', ''));

        const status = (apiMatch && sheetMatch) ? "PASS" : "FAIL";

        return {
            status,
            expected: expectedCake,
            actualApi: apiVal || 'N/A',
            actualSheet: cakeIncome,
            uiValue: sliderVal,
            details: status === "PASS" ?
                `Mapping verified: UI ${sliderVal} -> Cake ${expectedCake}` :
                `MISMATCH DETECTED: UI ${sliderVal} Expected ${expectedCake} but API got ${apiVal}`
        };
    }

    async suggestFix(page, goal, campaignId = 'global') {
        console.log(`🤖 [${this.name}] Analyzing ${goal} for ${campaignId}...`);

        const memoryKey = `${campaignId}:${goal}`;
        if (this.memory.fixes[memoryKey]) {
            const rememberedSelector = this.memory.fixes[memoryKey];
            const isStillValid = await page.locator(rememberedSelector).first().isVisible({ timeout: 2000 }).catch(() => false);
            if (isStillValid) {
                console.log(`🧠 [${this.name}] Found existing fix in memory: ${rememberedSelector}`);
                return rememberedSelector;
            }
        }

        try {
            const domMap = await page.evaluate(() => {
                const els = Array.from(document.querySelectorAll('button, a, input, [role="button"], .btn, .next, .submit'));
                return els.map(el => ({
                    tag: el.tagName,
                    id: el.id,
                    className: el.className,
                    text: el.innerText?.trim().substring(0, 50),
                    isVisible: el.offsetWidth > 0 && el.offsetHeight > 0
                })).filter(el => el.isVisible);
            });

            const bestMatch = this._heuristicBrain(domMap, goal);
            if (bestMatch) {
                console.log(`✨ [${this.name}] New fix suggested: ${bestMatch.selector}`);
                return bestMatch.selector;
            }
        } catch (e) {
            console.error(`❌ [${this.name}] Analysis error:`, e.message);
        }
        return null;
    }

    approveFix(campaignId, goal, selector) {
        const memoryKey = `${campaignId}:${goal}`;
        this.memory.fixes[memoryKey] = selector;
        this.saveMemory();
        console.log(`✅ [${this.name}] Fix approved and saved to memory: ${selector}`);
    }

    _heuristicBrain(elements, goal) {
        const keywords = goal.toLowerCase().split(' ');
        for (const el of elements) {
            const score = ((el.text || '') + ' ' + (el.id || '') + ' ' + (el.className || '')).toLowerCase();
            if (keywords.some(kw => score.includes(kw))) {
                const selector = el.id ? `#${el.id}` :
                    el.className ? `.${el.className.split(' ').join('.')}` :
                    `${el.tag.toLowerCase()}:has-text("${el.text}")`;
                return { selector };
            }
        }
        return null;
    }
}

module.exports = new AIAgent();
