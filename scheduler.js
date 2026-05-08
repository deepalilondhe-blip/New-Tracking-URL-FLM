const { exec } = require('child_process');
const path = require('path');
const fs = require('fs');
const nodemailer = require('nodemailer');
require('dotenv').config();

// Configuration: List of all 13 core campaign runners in sequence
const runnerScripts = [
  'run-ftd-x.js',
  'run-fsi-ppc2.js',
  'run-tra-cpl.js',
  'run-tra-d3.js',
  'run-ppc-st.js',
  'run-ppc-st2.js',
  'run-ppc-st2-api.js',
  'run-ppc-m-ca.js',
  'run-ppc-cr.js',
  'run-ppc-fs.js',
  'run-ppc.js',
  'run-tra-cpm.js',
  'run-fth-x.js'
];

// Load Interval from environment variables (default to 2 hours)
const intervalHours = parseFloat(process.env.SCHEDULER_INTERVAL_HOURS) || 2.0;
const intervalMs = intervalHours * 60 * 60 * 1000;

function formatTimestamp() {
  return new Date().toLocaleString();
}

/**
 * Execute a single runner file as a promise
 */
function runScript(scriptFile) {
  return new Promise((resolve) => {
    const scriptPath = path.join(__dirname, scriptFile);
    if (!fs.existsSync(scriptPath)) {
      console.warn(`⚠️  Runner file not found: ${scriptFile}. Skipping.`);
      return resolve({ scriptFile, success: false, error: 'File not found' });
    }

    console.log(`\n================================================================`);
    console.log(`🚀 [${formatTimestamp()}] RUNNING: ${scriptFile}`);
    console.log(`================================================================`);

    const child = exec(`node "${scriptFile}"`, { cwd: __dirname }, (error, stdout, stderr) => {
      if (error) {
        console.error(`❌ [${formatTimestamp()}] FAILED: ${scriptFile}`);
        console.error(`Error: ${error.message}`);
        return resolve({ scriptFile, success: false, error: error.message });
      }
      
      console.log(`✅ [${formatTimestamp()}] COMPLETED: ${scriptFile}`);
      return resolve({ scriptFile, success: true });
    });

    // Pipe stdout and stderr to scheduler terminal in real-time
    child.stdout.on('data', (data) => {
      process.stdout.write(`[${scriptFile}] ${data}`);
    });

    child.stderr.on('data', (data) => {
      process.stderr.write(`[${scriptFile}] [STDERR] ${data}`);
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
    auth: {
      user: user,
      pass: pass
    }
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
    
    rowsHtml += `
      <tr style="border-bottom: 1px solid #e2e8f0;">
        <td style="padding: 14px 12px; font-weight: 500; color: #1e293b;">${r.scriptFile}</td>
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
      <title>Automation Status Report</title>
    </head>
    <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f8fafc; margin: 0; padding: 20px;">
      <div style="max-width: 750px; margin: 0 auto; background-color: #ffffff; border-radius: 12px; box-shadow: 0 4px 16px rgba(0,0,0,0.06); overflow: hidden; border: 1px solid #e2e8f0;">
        <!-- Header -->
        <div style="background: linear-gradient(135deg, #0f172a 0%, #1e293b 100%); padding: 35px 30px; text-align: center; color: #ffffff;">
          <h1 style="margin: 0; font-size: 24px; font-weight: 700; letter-spacing: 0.5px;">🔄 Leads Automation Batch Report</h1>
          <p style="margin: 6px 0 0 0; opacity: 0.85; font-size: 14px;">Executed on: ${formatTimestamp()}</p>
        </div>
        
        <!-- Content -->
        <div style="padding: 30px;">
          <h2 style="color: #0f172a; margin-top: 0; font-size: 18px; border-bottom: 2px solid #3b82f6; padding-bottom: 10px; font-weight: 600;">📋 Execution Summary</h2>
          <table style="width: 100%; border-collapse: collapse; margin-bottom: 30px;">
            <tr>
              <td style="padding: 10px 0; color: #64748b; width: 40%; font-size: 15px;">Total Run Duration:</td>
              <td style="padding: 10px 0; font-weight: bold; color: #0f172a; font-size: 15px;">${durationMinutes} Minutes</td>
            </tr>
            <tr>
              <td style="padding: 10px 0; color: #64748b; font-size: 15px;">Total Runners Executed:</td>
              <td style="padding: 10px 0; font-weight: bold; color: #0f172a; font-size: 15px;">${results.length}</td>
            </tr>
            <tr>
              <td style="padding: 10px 0; color: #10b981; font-size: 15px;">Succeeded Campaigns:</td>
              <td style="padding: 10px 0; font-weight: bold; color: #10b981; font-size: 15px;">${succeededCount}</td>
            </tr>
            <tr>
              <td style="padding: 10px 0; color: #ef4444; font-size: 15px;">Failed Campaigns:</td>
              <td style="padding: 10px 0; font-weight: bold; color: #ef4444; font-size: 15px;">${failedCount}</td>
            </tr>
          </table>

          <h2 style="color: #0f172a; font-size: 18px; border-bottom: 2px solid #3b82f6; padding-bottom: 10px; font-weight: 600;">📊 Detailed Campaign Statuses</h2>
          <table style="width: 100%; border-collapse: collapse; margin-top: 15px;">
            <thead>
              <tr style="background-color: #f1f5f9; border-bottom: 2px solid #cbd5e1;">
                <th style="padding: 12px; text-align: left; color: #475569; font-weight: 600; font-size: 14px;">Campaign Runner</th>
                <th style="padding: 12px; text-align: center; color: #475569; font-weight: 600; font-size: 14px; width: 100px;">Status</th>
                <th style="padding: 12px; text-align: left; color: #475569; font-weight: 600; font-size: 14px;">Details / Error Reason</th>
              </tr>
            </thead>
            <tbody>
              ${rowsHtml}
            </tbody>
          </table>
        </div>

        <!-- Footer -->
        <div style="background-color: #f8fafc; padding: 25px; text-align: center; border-top: 1px solid #e2e8f0; color: #94a3b8; font-size: 13px; line-height: 1.5;">
          <p style="margin: 0;">This is an automated status update compiled from your local lead generation pipeline.</p>
          <p style="margin: 5px 0 0 0;">Securely sent to: <strong>${recipient}</strong></p>
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

  const startTime = Date.now();
  const results = [];

  for (const script of runnerScripts) {
    const result = await runScript(script);
    results.push(result);
    // 3-second breathing room between campaigns to let OS clean port sockets
    await new Promise(resolve => setTimeout(resolve, 3000));
  }

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

  if (failed > 0) {
    console.log('❌ Failed scripts summary:');
    results.forEach(r => {
      if (!r.success) {
        console.log(`   - ${r.scriptFile}: ${r.error}`);
      }
    });
  }

  // Trigger Email Send
  await sendEmailReport(results, durationMinutes);

  // Generate Markdown Summary for GitHub Cloud Summary
  try {
    const fs = require('fs');
    let md = `## 🔄 Leads Automation Batch Report\n\n`;
    md += `**Executed on:** ${formatTimestamp()}\n\n`;
    md += `### 📋 Execution Summary\n\n`;
    md += `| Metric | Value |\n`;
    md += `| :--- | :--- |\n`;
    md += `| **Total Run Duration** | ${durationMinutes} Minutes |\n`;
    md += `| **Total Runners Executed** | ${results.length} |\n`;
    md += `| **Succeeded Campaigns** | 🟢 ${succeeded} |\n`;
    md += `| **Failed Campaigns** | 🔴 ${failed} |\n\n`;
    
    md += `### 📊 Detailed Campaign Statuses\n\n`;
    md += `| Campaign Runner | Status | Details / Error Reason |\n`;
    md += `| :--- | :---: | :--- |\n`;
    
    results.forEach(r => {
      const statusIcon = r.success ? '🟢 PASS' : '🔴 FAIL';
      const cleanError = r.success ? 'Success' : r.error.replace(/\n/g, ' ');
      md += `| \`${r.scriptFile}\` | ${statusIcon} | ${cleanError} |\n`;
    });
    
    fs.writeFileSync('execution-summary.md', md);
    console.log('✅ Generated execution-summary.md for GitHub Cloud Summary');
  } catch (err) {
    console.error('⚠️ Failed to generate execution-summary.md:', err.message);
  }

  console.log(`\n⏳ Next automation batch will start at: ${new Date(Date.now() + intervalMs).toLocaleString()}`);
}

const runOnce = process.argv.includes('--once');

// Start immediately on launch
if (runOnce) {
  runBatch().then(() => {
    console.log('🏁 Batch run completed in single-execution mode. Exiting.');
    process.exit(0);
  }).catch((err) => {
    console.error('❌ Batch run encountered an unhandled error:', err);
    process.exit(1);
  });
} else {
  runBatch();

  // Schedule recurrences
  setInterval(runBatch, intervalMs);
}
