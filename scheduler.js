const { exec } = require('child_process');
const path = require('path');
const fs = require('fs');
const nodemailer = require('nodemailer');
require('dotenv').config();
const emailUtils = require('./utils/emailUtils');
const flmAgent = require('./utils/flmAgent');
const dailyLogger = require('./utils/dailyLogger');

// Load campaigns from configuration file dynamically
const configPath = path.join(__dirname, 'config', 'campaigns.json');
let campaigns = [];
if (fs.existsSync(configPath)) {
  try {
    campaigns = JSON.parse(fs.readFileSync(configPath, 'utf8'));
  } catch (e) {
    console.error('⚠️ Could not parse campaigns config inside scheduler, falling back to empty list:', e.message);
  }
}

// Support filtering campaigns via command line argument (e.g. node scheduler.js --campaigns original,aftr-main)
const campaignFilterArg = process.argv.includes('--campaigns') ? process.argv[process.argv.indexOf('--campaigns') + 1] : null;
if (campaignFilterArg) {
  const allowedIds = campaignFilterArg.split(',').map(id => id.trim().toLowerCase());
  campaigns = campaigns.filter(c => allowedIds.includes(c.id.toLowerCase()));
  console.log(`🔍 [Filter] Scheduler running only: ${campaigns.map(c => c.name).join(', ')}`);
}

// Map each campaign config to a Tablet-only execution matrix
const runnerScripts = campaigns.map(c => {
  const matrix = [
    // --- Mac Device ---
    { campaignId: c.id, viewport: 'desktop', browser: 'chromium', label: 'Mac - Device' }
  ];

  return matrix;
});

// Load Interval from environment variables (default to 2 hours)
const intervalHours = parseFloat(process.env.SCHEDULER_INTERVAL_HOURS) || 2.0;
const intervalMs = intervalHours * 60 * 60 * 1000;

function formatTimestamp() {
  return new Date().toLocaleString();
}

/**
 * Execute a single runner via the unified run-master.js orchestrator
 */
function runScript(campaignId, viewport, browserEngine = 'chromium', label = 'Standard') {
  return new Promise((resolve) => {
    const campaign = campaigns.find(c => c.id === campaignId);
    const campaignUrl = campaign ? campaign.url : 'Unknown URL';
    const campaignName = campaign ? campaign.name : campaignId.toUpperCase();

    console.log(`\n================================================================`);
    console.log(`🚀 [${formatTimestamp()}] RUNNING: ${campaignName} [${label.toUpperCase()}]`);
    console.log(`🔗 Target URL: ${campaignUrl}`);
    console.log(`================================================================`);

    // Local laptop runs headed so you can watch. GitHub Actions / CI must be headless
    // because there is no desktop display when the laptop is off.
    const isCi = process.env.CI === 'true' || process.env.GITHUB_ACTIONS === 'true';
    const runHeadless = process.argv.includes('--headless') || isCi;
    const env = { 
      ...process.env, 
      PROCESS_BROWSER: browserEngine,
      PROCESS_LABEL: label,
      HEADLESS: runHeadless ? 'true' : 'false',
      CI: isCi ? 'true' : (process.env.CI || '')
    };
    
    // Execute node run-master.js in visible mode
    const child = exec(`node -r "./utils/browser-intercept.js" run-master.js --campaign "${campaignId}" --viewport "${viewport}"`, { cwd: __dirname, env }, (error, stdout, stderr) => {
      const displayLabel = `${campaignId} [${label}][${browserEngine.toUpperCase()}]`;
      
      // Attempt to parse JSON evidence from stdout
      let evidence = {};
      try {
        const jsonLines = stdout.split('\n').filter(line => line.trim().startsWith('{') && line.trim().endsWith('}'));
        if (jsonLines.length > 0) {
          evidence = JSON.parse(jsonLines[jsonLines.length - 1]);
        }
      } catch (e) {}

      if (error || evidence.success === false) {
        const errorMsg = evidence.error || error?.message || 'Unknown execution error';
        const leadIdStr = evidence.leadId ? ` | Lead ID: ${evidence.leadId}` : '';
        console.error(`❌ [${formatTimestamp()}] FAILED: ${displayLabel}${leadIdStr}`);
        return resolve({ 
          campaignId, viewport, browser: browserEngine, label, 
          success: false, 
          error: errorMsg,
          leadId: evidence.leadId || null,
          apiStatus: evidence.apiStatus || 'FAILED',
          screenshot: evidence.screenshot,
          video: evidence.video
        });
      }
      
      const leadIdStr = evidence.leadId ? ` | Lead ID: ${evidence.leadId}` : '';
      console.log(`✅ [${formatTimestamp()}] COMPLETED: ${displayLabel}${leadIdStr}`);
      return resolve({ 
        campaignId, viewport, browser: browserEngine, label, 
        success: true, 
        leadId: evidence.leadId || null,
        apiStatus: evidence.apiStatus || '200 OK'
      });
    });

    // Pipe outputs to scheduler terminal
    child.stdout.on('data', (data) => {
      process.stdout.write(`[${campaignId}][${label}] ${data}`);
    });

    child.stderr.on('data', (data) => {
      process.stderr.write(`[${campaignId}][${label}] [STDERR] ${data}`);
    });
  });
}

/**
 * Email status sender
 */
async function sendEmailReport(results, durationMinutes) {
  const host = process.env.SMTP_HOST;
  const port = process.env.SMTP_PORT;
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;
  const recipient = process.env.REPORT_EMAIL_RECIPIENT || 'deepali.londhe@magnetoitsolutions.com';

  if (!host || !port || !user || !pass) {
    console.log('\n⚠️  SMTP settings (SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS) not configured in .env.');
    console.log(`⚠️  Skipping email status report to ${recipient}.`);
    return;
  }

  console.log(`\n📧 Sending batch status email report to ${recipient}...`);

  const transporter = nodemailer.createTransport({
    host: host,
    port: parseInt(port),
    secure: process.env.SMTP_SECURE === 'true',
    auth: { user, pass }
  });

  const succeededCount = results.filter(r => r.success).length;
  const failedCount = results.length - succeededCount;

  // Build beautiful HTML email body
  let rowsHtml = '';
  results.forEach(r => {
    const statusColor = r.success ? '#28a745' : '#dc3545';
    const statusBg = r.success ? '#eafaf1' : '#fdf2f2';
    const statusText = r.success ? 'PASS' : 'FAIL';
    const errorDetails = r.success ? 'N/A' : `<span style="color:#dc3545; font-size:12px;">${r.error || 'Unknown Error'}</span>`;
    
    const displayEngine = (r.browser || 'chromium').toUpperCase();
    const displayLabel = `${(r.campaignId || 'Unknown').toUpperCase()} [${(r.viewport || 'desktop').toUpperCase()}]`;
    
    rowsHtml += `
      <tr style="border-bottom: 1px solid #e2e8f0;">
        <td style="padding: 14px 12px; font-weight: 500; color: #1e293b;">
          ${displayLabel}
          <span style="font-size: 11px; color: #475569; font-weight: 600; margin-left: 6px; background-color: #f1f5f9; padding: 2px 6px; border-radius: 4px; border: 1px solid #cbd5e1; vertical-align: middle;">${displayEngine}</span>
        </td>
        <td style="padding: 14px 12px; text-align: center;">
          <span style="display: inline-block; padding: 4px 10px; font-weight: bold; font-size: 12px; border-radius: 4px; color: ${statusColor}; background-color: ${statusBg}; text-transform: uppercase; letter-spacing: 0.5px;">
            ${statusText}
          </span>
        </td>
        <td style="padding: 14px 12px; color: #475569;">${errorDetails}</td>
      </tr>
    `;
  });

  const htmlBody = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <style>
        body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif; line-height: 1.6; color: #334155; margin: 0; padding: 0; background-color: #f8fafc; }
        .wrapper { max-width: 700px; margin: 40px auto; padding: 20px; }
        .container { background-color: #ffffff; border-radius: 12px; border: 1px solid #e2e8f0; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.05); overflow: hidden; }
        .header { background: linear-gradient(135deg, #1e3a8a, #3b82f6); color: #ffffff; padding: 32px 24px; text-align: center; }
        .header h1 { margin: 0; font-size: 24px; font-weight: 800; letter-spacing: -0.5px; }
        .header p { margin: 8px 0 0; opacity: 0.9; font-size: 14px; }
        .content { padding: 32px 24px; }
        .stats-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 16px; margin-bottom: 32px; }
        .stat-card { background-color: #f1f5f9; border-radius: 8px; padding: 16px; text-align: center; border: 1px solid #e2e8f0; }
        .stat-val { font-size: 22px; font-weight: 800; color: #1e3a8a; }
        .stat-lbl { font-size: 12px; color: #64748b; text-transform: uppercase; font-weight: bold; margin-top: 4px; }
        .table-title { font-size: 16px; font-weight: 700; color: #1e293b; margin: 0 0 16px; }
        .table-container { border: 1px solid #e2e8f0; border-radius: 8px; overflow: hidden; }
        table { width: 100%; border-collapse: collapse; text-align: left; font-size: 14px; }
        th { background-color: #f8fafc; padding: 12px; font-weight: 600; color: #475569; border-bottom: 1px solid #e2e8f0; }
        .footer { text-align: center; font-size: 12px; color: #94a3b8; margin-top: 24px; }
      </style>
    </head>
    <body>
      <div class="wrapper">
        <div class="container">
          <div class="header">
            <h1>Leads Automation Status Report</h1>
            <p>Execution completed at: ${formatTimestamp()}</p>
          </div>
          <div class="content">
            <div class="stats-grid" style="display: table; width: 100%; table-layout: fixed; border-spacing: 12px 0; margin-bottom: 24px;">
              <div class="stat-card" style="display: table-cell; background-color: #f1f5f9; border-radius: 8px; padding: 16px; text-align: center; border: 1px solid #e2e8f0;">
                <div class="stat-val" style="font-size: 20px; font-weight: 800; color: #1e3a8a;">${durationMinutes}m</div>
                <div class="stat-lbl" style="font-size: 11px; color: #64748b; text-transform: uppercase; font-weight: bold; margin-top: 4px;">Duration</div>
              </div>
              <div class="stat-card" style="display: table-cell; background-color: #eafaf1; border-radius: 8px; padding: 16px; text-align: center; border: 1px solid #c2f0d5;">
                <div class="stat-val" style="font-size: 20px; font-weight: 800; color: #28a745;">${succeededCount}</div>
                <div class="stat-lbl" style="font-size: 11px; color: #28a745; text-transform: uppercase; font-weight: bold; margin-top: 4px;">Succeeded</div>
              </div>
              <div class="stat-card" style="display: table-cell; background-color: #fdf2f2; border-radius: 8px; padding: 16px; text-align: center; border: 1px solid #f8d7da;">
                <div class="stat-val" style="font-size: 20px; font-weight: 800; color: #dc3545;">${failedCount}</div>
                <div class="stat-lbl" style="font-size: 11px; color: #dc3545; text-transform: uppercase; font-weight: bold; margin-top: 4px;">Failed</div>
              </div>
            </div>
            
            <h2 class="table-title">Detailed Campaign Metrics</h2>
            <div class="table-container">
              <table>
                <thead>
                  <tr>
                    <th style="padding: 12px;">Campaign Instance</th>
                    <th style="padding: 12px; text-align: center; width: 100px;">Status</th>
                    <th style="padding: 12px;">Details</th>
                  </tr>
                </thead>
                <tbody>
                  ${rowsHtml}
                </tbody>
              </table>
            </div>
          </div>
        </div>
        <div class="footer">
          <p>This is an automated status message from your Leads Automation Engine.</p>
        </div>
      </div>
    </body>
    </html>
  `;

  try {
    const info = await transporter.sendMail({
      from: `"Leads Automation Suite" <${user}>`,
      to: recipient,
      subject: `🔄 Automation Report: [${succeededCount}/${results.length} Passed] - ${formatTimestamp()}`,
      html: htmlBody
    });

    console.log(`✅ Status report email successfully sent to ${recipient}! (Message ID: ${info.messageId})`);
  } catch (error) {
    console.error(`❌ Failed to send status email report via SMTP:`, error.message);
  }
}

/**
 * Main batch execution loop
 */
async function runBatch() {
  console.log(`\n🤖 ================================================================`);
  console.log(`🤖 STARTING LEADS AUTOMATION BATCH RUN [${formatTimestamp()}]`);
  console.log(`🤖 Interval configured: every ${intervalHours} hours`);
  console.log(`🤖 ================================================================`);

  const options = { timeZone: 'Asia/Kolkata', weekday: 'long' };
  const weekdayName = new Intl.DateTimeFormat('en-US', options).format(new Date());
  const dayMap = { 'Sunday': 0, 'Monday': 1, 'Tuesday': 2, 'Wednesday': 3, 'Thursday': 4, 'Friday': 5, 'Saturday': 6 };
  const dayOfWeek = dayMap[weekdayName];
  const allowedDays = [1, 3, 5]; // Monday, Wednesday, Friday

  const runOnce = process.argv.includes('--once');
  if (!runOnce && !allowedDays.includes(dayOfWeek)) {
    console.log(`\n[${formatTimestamp()}] 🗓️ Skipping today's run. Scheduler is configured to run ONLY on Monday, Wednesday, and Friday.`);
    return;
  }

  const startTime = Date.now();
  const results = [];
  const stateFilePath = path.join(__dirname, 'scheduler-state.json');
  let state = { completed: [] };
  
  // Clear any existing state so we ALWAYS run all campaigns on every scheduler start
  try {
    fs.writeFileSync(stateFilePath, JSON.stringify(state, null, 2));
  } catch (err) {
    console.warn('⚠️ Could not reset scheduler state file.');
  }

  // 🛡️ [FLM Agent] PROACTIVE URL VERIFICATION
  console.log(`\n🤖 [FLM Agent] Starting Global URL Health Verification...`);
  for (const campaign of campaigns) {
    const health = await flmAgent.verifyUrlHealth(campaign.name, campaign.url);
    if (!health.healthy) {
      console.error(`🔴 [FLM Agent] ${campaign.name} is DOWN: ${health.error}`);
      results.push({ 
        campaignId: campaign.id, 
        viewport: 'global', 
        browser: 'none', 
        label: 'GLOBAL_URL_CHECK', 
        success: false, 
        error: `URL is DOWN: ${health.error}` 
      });
    }
  }
  console.log(`🤖 [FLM Agent] Global Health Verification Complete.\n`);

  // Flatten all runs into a single queue, excluding any campaigns that failed the global health check
  const failedGlobalIds = new Set(results.map(r => r.campaignId));
  const allRuns = [];
  for (const campaignGroup of runnerScripts) {
    const filtered = campaignGroup.filter(run => !failedGlobalIds.has(run.campaignId));
    allRuns.push(...filtered);
  }

  console.log(`\n================================================================`);
  console.log(`⚡ Processing ${allRuns.length} Tasks Sequentially (One by One)`);
  console.log(`================================================================`);

  let runIndex = 0;
  async function worker() {
    while (runIndex < allRuns.length) {
      const run = allRuns[runIndex++];
      const stateKey = `${run.campaignId}:${run.viewport}:${run.browser}:${run.label}`;
      
      const res = await runScript(run.campaignId, run.viewport, run.browser, run.label).catch(err => {
        console.error(`⚠️  [ERROR] Execution crashed for ${run.campaignId} [${run.label}]:`, err.message);
        return { ...run, success: false, error: err.message };
      });

      // Override: If the campaign has a synthetic/invalid Lead ID, mark the run as failed!
      if (res.success && res.leadId) {
        const lower = res.leadId.toLowerCase();
        if (lower.includes('ckm') || lower.includes('test') || lower.includes('invalid') || lower === '—') {
          res.success = false;
          res.error = `Invalid Lead ID: ${res.leadId}`;
          res.apiStatus = 'Invalid Lead ID';
        }
      }
      results.push(res);
      
      // Accumulate results for the daily summary
      await dailyLogger.logResult(res);

      if (res.success) {
        state.completed.push(stateKey);
        try {
          fs.writeFileSync(stateFilePath, JSON.stringify(state, null, 2));
        } catch (err) {
          console.error('⚠️ Failed to save scheduler state:', err.message);
        }
      } else {
        console.warn(`🚨 [AI Agent] Failure recorded for ${res.campaignId} [${res.label}]. Logged to Dashboard.`);
      }
    }
  }

  // Launch sequential worker
  await worker();

  const durationMinutes = ((Date.now() - startTime) / (1000 * 60)).toFixed(2);
  const total = results.length;
  const succeeded = results.filter(r => r.success).length;
  const failed = total - succeeded;

  console.log(`\n📊 ================================================================`);
  console.log(`📊 BATCH COMPLETED IN ${durationMinutes} MINUTES`);
  console.log(`📊 Total Runners Executed: ${total}`);
  console.log(`📊 Succeeded:              ${succeeded}`);
  console.log(`📊 Failed:                 ${failed}`);
  console.log(`📊 ================================================================`);

  // Send Professional Intelligence Report after every batch completion
  console.log('🕕 [Scheduler] Dispatching Batch Intelligence Report...');
  const summary = dailyLogger.getDailySummary();
  summary.durationMinutes = Number(durationMinutes);
  await sendProfessionalDailyReport(summary);

  // Reset completed state on successful full batch completion
  try {
    fs.writeFileSync(stateFilePath, JSON.stringify({ completed: [] }, null, 2));
  } catch (err) {}

  console.log(`\n⏳ Next automation batch will start at: ${new Date(Date.now() + intervalMs).toLocaleString()}`);
}

/**
 * 🕕 DAILY SUMMARY TRIGGER
 */
async function checkAndSendDailySummary() {
  const now = new Date();
  const currentHour = now.getHours();
  const currentMinute = now.getMinutes();
  const currentDay = now.getDay();
  const summary = dailyLogger.getDailySummary();

  // Temporary test trigger for 6:10 PM today (or standard Mon-Fri 18:00)
  const isTargetTime = (currentHour === 18 && currentMinute >= 10);
  const isWorkingDay = currentDay !== 0 && currentDay !== 6;

  if (isTargetTime && !summary.emailSent && isWorkingDay) {
    console.log('🕕 [Scheduler] Sending Daily Professional Summary Intelligence...');
    await sendProfessionalDailyReport(summary);
    dailyLogger.markEmailSent();
  }
}

/**
 * 📧 PROFESSIONAL DAILY REPORT (Branded FLM Version)
 */
async function sendProfessionalDailyReport(summary) {
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;
  const toList = 'deepali.londhe@magnetoitsolutions.com';
  const ccList = '';
  const recipient = toList;

  const campaignLookup = new Map(campaigns.map(c => [c.id, c]));

  // Helper to determine if a campaign is a TRA campaign
  const isTraCampaign = (campaignId) => {
    const id = campaignId.toLowerCase();
    return id.startsWith('tra-') || id.startsWith('ppc-') || id === 'guardian-tax-relief-ppc';
  };

  // Sort sequentially based on order in campaigns.json
  const campaignIndexMap = new Map(campaigns.map((c, idx) => [c.id, idx]));
  const sortSequential = (a, b) => (campaignIndexMap.get(a.campaignId) || 0) - (campaignIndexMap.get(b.campaignId) || 0);

  // Deduplicate runs by campaignId, keeping the most recent one (highest index/timestamp)
  const uniqueRunsMap = new Map();
  const allRuns = summary.runs || [];
  allRuns.forEach(r => {
    uniqueRunsMap.set(r.campaignId, r);
  });
  const latestRuns = Array.from(uniqueRunsMap.values());

  const totalCount = latestRuns.length;
  const succeededCount = latestRuns.filter(r => r.success).length;
  const failedCount = totalCount - succeededCount;

  const traRuns = latestRuns.filter(r => isTraCampaign(r.campaignId)).sort(sortSequential);
  const nonTraRuns = latestRuns.filter(r => !isTraCampaign(r.campaignId)).sort(sortSequential);

  // Lead ID validation helper (excludes test/synthetic IDs like ckm58725 or ckmtestpixel)
  const isValidLeadId = (id) => {
    if (!id) return false;
    const lower = id.toLowerCase();
    return !lower.includes('ckm') && !lower.includes('test') && !lower.includes('invalid') && lower !== '—';
  };

  // Helper to generate Table Rows HTML
  const generateTableRows = (runsList) => {
    if (runsList.length === 0) {
      return `<tr><td colspan="6" style="padding: 20px; text-align: center; color: #64748b; font-style: italic;">No campaigns executed in this section today.</td></tr>`;
    }
    return runsList.map(r => {
      const cfg = campaignLookup.get(r.campaignId);
      const domainName = cfg?.name || r.campaignId.toUpperCase();
      const url = cfg?.url || 'N/A';
      
      const displayLeadId = isValidLeadId(r.leadId) ? r.leadId : '—';
      const passMark = r.success ? '<span style="color: #166534; font-weight: 800; font-size: 12px;">PASS</span>' : '<span style="color: #cbd5e1;">—</span>';
      const failMark = !r.success ? '<span style="color: #991b1b; font-weight: 800; font-size: 12px;">FAILED</span>' : '<span style="color: #cbd5e1;">—</span>';
      const apiStatusText = r.apiStatus || (r.success ? '200 OK' : 'N/A');
      const apiStatusColor = r.success ? '#0891b2' : '#991b1b';
      
      return `
        <tr style="border-bottom: 1px solid #f1f5f9;">
          <td style="padding: 12px 10px; font-weight: 700; color: #1e293b; vertical-align: top; word-break: break-word;">
            ${domainName}
            <span style="font-weight: 400; color: #94a3b8; font-size: 9px;">[${r.viewport}]</span>
          </td>
          <td style="padding: 12px 10px; font-size: 11px; vertical-align: top; word-break: break-all;">
            <a href="${url}" style="color: #0891b2; text-decoration: none;">${url}</a>
          </td>
          <td style="padding: 12px 10px; text-align: center; vertical-align: top; font-family: Consolas, monospace; font-weight: 700; font-size: 11px; color: #0f172a; word-break: break-all;">
            ${displayLeadId}
          </td>
          <td style="padding: 12px 10px; text-align: center; vertical-align: top;">
            ${passMark}
          </td>
          <td style="padding: 12px 10px; text-align: center; vertical-align: top;">
            ${failMark}
          </td>
          <td style="padding: 12px 10px; text-align: center; vertical-align: top; font-weight: 600; color: ${apiStatusColor}; font-size: 11px;">
            ${apiStatusText}
          </td>
        </tr>
      `;
    }).join('');
  };

  const traTableRowsHtml = generateTableRows(traRuns);
  const nonTraTableRowsHtml = generateTableRows(nonTraRuns);
  
  const sheetId = process.env.GOOGLE_SHEET_ID || '1rXIg3dMQ4APH3lHLcfWYfP45PnOAKmV9POkoSS3YWxI';
  const sheetUrl = `https://docs.google.com/spreadsheets/d/${sheetId}/edit`;

  // Build the highlighted failed list for the top section
  const failedRuns = latestRuns.filter(r => !r.success);
  let failedListHtml = '';
  if (failedRuns.length > 0) {
    failedListHtml = `
      <div style="background: #fee2e2; border-left: 4px solid #dc2626; padding: 15px; border-radius: 4px; margin-bottom: 25px;">
        <div style="color: #991b1b; font-weight: 800; font-size: 13px; margin-bottom: 8px; text-transform: uppercase;">⚠️ FAILED URLS (ACTION REQUIRED)</div>
        <ul style="margin: 0; padding-left: 20px; font-size: 12px; color: #7f1d1d; line-height: 1.6;">
          ${failedRuns.map(r => {
            const cfg = campaignLookup.get(r.campaignId);
            const name = cfg?.name || r.campaignId.toUpperCase();
            const url = cfg?.url || 'N/A';
            const err = r.error || 'Timeout/Verification Failed';
            const isVpn = cfg?.useVpn ? ' (VPN)' : '';
            return `<li><b>${name}${isVpn}:</b> <a href="${url}" style="color: #b91c1c; text-decoration: underline;">${url}</a> - <span style="font-weight: bold; color: #dc2626;">${err}</span></li>`;
          }).join('')}
        </ul>
      </div>
    `;
  }
  
  const htmlBody = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <style>
        body { font-family: 'Segoe UI', Arial, sans-serif; line-height: 1.6; color: #1e293b; background: #f1f5f9; margin: 0; padding: 20px; }
        .card { max-width: 980px; margin: auto; background: #ffffff; border-radius: 20px; box-shadow: 0 20px 50px rgba(0,0,0,0.1); overflow: hidden; border: 1px solid #e2e8f0; }
        .header { background: linear-gradient(135deg, #0891b2 0%, #7e22ce 100%); color: #ffffff; padding: 20px 30px; text-align: center; }
        .header h1 { margin: 0; font-size: 20px; font-weight: 800; text-transform: uppercase; letter-spacing: 2px; }
        .header p { margin: 5px 0 0; opacity: 0.9; font-size: 12px; font-weight: 600; }
        .content { padding: 30px; }
        .footer { padding: 25px; text-align: center; background: #0f172a; font-size: 11px; color: #94a3b8; }
      </style>
    </head>
    <body>
      <div class="card">
        <div class="header">
          <h1>FLM Automation</h1>
          <p>Intelligence Briefing - ${new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</p>
        </div>
        
        <div class="content">
          <div style="font-size: 15px; font-weight: 700; color: #1e293b; margin-bottom: 20px; background: #f8fafc; padding: 12px 15px; border-radius: 8px; border: 1px solid #e2e8f0;">
            📊 URL Count - ${totalCount} &nbsp;|&nbsp; Passed: ${succeededCount} &nbsp;|&nbsp; Failed: ${failedCount}
          </div>

          ${failedListHtml}

          <!-- Section 1: FLM URL (NON TRA) -->
          <div style="font-size: 15px; font-weight: 800; color: #0f172a; border-bottom: 2px solid #f1f5f9; padding-bottom: 10px; margin: 25px 0 15px;">FLM URL (NON TRA)</div>
          <table style="width: 100%; border-collapse: collapse; font-size: 12px; margin-bottom: 30px; table-layout: fixed;">
            <thead>
              <tr style="text-align: left; color: #64748b; border-bottom: 1.5px solid #cbd5e1; font-weight: 700;">
                <th style="padding: 10px; width: 18%;">DOMAIN NAME</th>
                <th style="padding: 10px; width: 28%;">URL</th>
                <th style="padding: 10px; text-align: center; width: 16%;">LEAD ID</th>
                <th style="padding: 10px; text-align: center; width: 10%;">PASS</th>
                <th style="padding: 10px; text-align: center; width: 10%;">FAILED</th>
                <th style="padding: 10px; text-align: center; width: 18%;">API STATUS</th>
              </tr>
            </thead>
            <tbody>
              ${nonTraTableRowsHtml}
            </tbody>
          </table>

          <!-- Section 2: TRA URL -->
          <div style="font-size: 15px; font-weight: 800; color: #0f172a; border-bottom: 2px solid #f1f5f9; padding-bottom: 10px; margin: 25px 0 15px;">TRA URL</div>
          <table style="width: 100%; border-collapse: collapse; font-size: 12px; margin-bottom: 30px; table-layout: fixed;">
            <thead>
              <tr style="text-align: left; color: #64748b; border-bottom: 1.5px solid #cbd5e1; font-weight: 700;">
                <th style="padding: 10px; width: 18%;">DOMAIN NAME</th>
                <th style="padding: 10px; width: 28%;">URL</th>
                <th style="padding: 10px; text-align: center; width: 16%;">LEAD ID</th>
                <th style="padding: 10px; text-align: center; width: 10%;">PASS</th>
                <th style="padding: 10px; text-align: center; width: 10%;">FAILED</th>
                <th style="padding: 10px; text-align: center; width: 18%;">API STATUS</th>
              </tr>
            </thead>
            <tbody>
              ${traTableRowsHtml}
            </tbody>
          </table>
          
        </div>

        <div class="footer">
          <p style="margin: 0 0 12px; font-weight: 700;">Google Sheet Report:</p>
          <p style="margin: 0 0 16px;">
            <a href="${sheetUrl}" style="color: #67e8f9; font-weight: 700; text-decoration: underline; word-break: break-all;">${sheetUrl}</a>
          </p>
          <p>© ${new Date().getFullYear()} Forward Leap Marketing. Confidential AI Intelligence.</p>
          <p style="opacity: 0.6;">You are receiving this because FLM Agent Security Mode is ENABLED.</p>
        </div>
      </div>
    </body>
    </html>
  `;

  // Save the report HTML locally first
  const reportPath = path.join(__dirname, 'logs', 'flm-agent-email-today.html');
  try {
    fs.writeFileSync(reportPath, htmlBody, 'utf8');
    console.log(`💾 Branded Daily Professional Summary saved locally to: ${reportPath}`);
  } catch (err) {
    console.error(`⚠️ Failed to save email HTML locally:`, err.message);
  }

  if (!user || !pass) {
    const message = `SMTP credentials (SMTP_USER, SMTP_PASS) are missing. The grouped campaign report was NOT emailed to ${recipient}.`;
    console.error(`\n❌ ${message}`);
    console.error('Preview is still saved at logs/flm-agent-email-today.html.');
    return;
  }

  const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: { user, pass }
  });

  const subject = `FLM Campaign Report: ${summary.succeeded}/${summary.total} PASS | DOMAIN | URL | LEAD ID | PASS | FAILED | API STATUS`;
  const mailOptions = {
    from: `"Deepali Londhe" <${user}>`,
    to: toList,
    subject,
    html: htmlBody
  };
  if (ccList) {
    mailOptions.cc = ccList;
  }
  await transporter.sendMail(mailOptions);
  console.log(`✅ Grouped campaign report emailed From: ${user}`);
  console.log(`✅ To: ${toList}`);
  console.log(`✅ Email subject: ${subject}`);
}

if (require.main === module) {
  const emailOnly = process.argv.includes('--email-only');
  const runOnce = process.argv.includes('--once');
  if (emailOnly) {
    const summary = dailyLogger.getDailySummary();
    sendProfessionalDailyReport(summary).then(() => process.exit(0)).catch((err) => {
      console.error('❌ Failed to send campaign report email:', err.message);
      process.exit(1);
    });
  } else if (runOnce) {
    runBatch().then(() => process.exit(0)).catch(() => process.exit(1));
  } else {
    runBatch();
    setInterval(runBatch, intervalMs);
  }
}

module.exports = {
  runBatch,
  sendProfessionalDailyReport,
  checkAndSendDailySummary
};
