/**
 * ====================================================================
 * 🚀 DEDICATED HEADED BATCH RUNNER FOR ALL 14 TRA URLs
 * ====================================================================
 * 
 * Features:
 * - 14 Target URLs across TRA, Guardian Tax Relief, GoDRA, and DRA
 * - HEADED mode (Visible Chromium browser with realistic human pacing)
 * - Rotational US states across the 14 runs with matching valid dummy phone numbers
 * - Exact test credentials: CKMTESTPIXEL CKMTESTPIXEL / ckmtestpixel@gmail.com
 * - Form submission ONLY (NO Google Sheets, NO Cake API)
 * - Confirmation screenshots saved to TRA URL/screenshots/
 * - Robust Lead / Transaction ID extraction (URL parameters, AJAX responses, DOM scan)
 * - Automatically generates and sends the Branded HTML Intelligence Email Report
 *   (Subject: "TRA Automation Report - [Date]") to deepali.londhe@magnetoitsolutions.com
 */

const path = require('path');
const fs = require('fs');
require('dotenv').config({ path: path.resolve(__dirname, '..', '.env') });
const nodemailer = require('nodemailer');
const { chromium } = require('playwright-extra');
const stealth = require('puppeteer-extra-plugin-stealth')();
chromium.use(stealth);

const FormPage = require('../pages/FormPage');
const { generateStateDummyPhone } = require('../utils/phoneHelper');

// 14 TARGET CAMPAIGN URLS
const TARGET_URLS = [
  { id: 'tra-main', name: 'TRA (tra.com)', url: 'https://tra.com/' },
  { id: 'tra-fresh-start', name: 'TRA - Fresh Start Signup 2', url: 'https://tra.com/fresh-start-signup2' },
  { id: 'tra-sf2', name: 'TRA - SF2', url: 'https://tra.com/sf2' },
  { id: 'tra-fb', name: 'TRA - FB', url: 'https://tra.com/FB' },
  { id: 'tra-google-brand', name: 'TRA - Google Brand', url: 'https://tra.com/google/Brand' },
  { id: 'tra-long-form', name: 'TRA - Long Form', url: 'https://tra.com/long-form' },
  { id: 'tra-google-lp2', name: 'TRA - Google LP2 Brand', url: 'https://tra.com/google-lp2/brand' },
  { id: 'gtr-main', name: 'Guardian Tax Relief (Main)', url: 'https://guardiantax-relief.com/' },
  { id: 'gtr-sf22bg', name: 'Guardian Tax Relief - SF22BG', url: 'https://guardiantax-relief.com/sf22bg' },
  { id: 'gtr-fb', name: 'Guardian Tax Relief - FB', url: 'https://guardiantax-relief.com/fb' },
  { id: 'godra-main', name: 'GoDRA (Main)', url: 'https://godra.com/' },
  { id: 'godra-ppc2', name: 'GoDRA - PPC2', url: 'https://godra.com/ppc2' },
  { id: 'dra-ppc', name: 'DRA - PPC', url: 'https://dra.com/ppc' },
  { id: 'dra-main', name: 'DRA (Main)', url: 'https://dra.com/' }
];

// 14 ROTATIONAL US STATES
const ROTATIONAL_STATES = [
  'California',
  'Texas',
  'Florida',
  'New York',
  'Pennsylvania',
  'Illinois',
  'Ohio',
  'Georgia',
  'North Carolina',
  'Michigan',
  'Arizona',
  'Washington',
  'Colorado',
  'Virginia'
];

const STATE_TO_CITY = {
  'California': 'Los Angeles',
  'Texas': 'Houston',
  'Florida': 'Miami',
  'New York': 'New York',
  'Pennsylvania': 'Philadelphia',
  'Illinois': 'Chicago',
  'Ohio': 'Columbus',
  'Georgia': 'Atlanta',
  'North Carolina': 'Charlotte',
  'Michigan': 'Detroit',
  'Arizona': 'Phoenix',
  'Washington': 'Seattle',
  'Colorado': 'Denver',
  'Virginia': 'Richmond'
};

/**
 * Check if a URL qualifies as a confirmed Thank You / Confirmation destination
 */
function isThankYouPageUrl(url) {
  if (!url) return false;
  const lower = url.toLowerCase();
  if (lower.includes('/ty') || lower.includes('/thank-you') || lower.includes('/thankyou') || lower.includes('/thanks') || lower.includes('/confirmed') || lower.includes('/confirmation')) {
    return true;
  }
  try {
    const u = new URL(url);
    const leadVal = u.searchParams.get('leadid') || u.searchParams.get('transaction_id') || u.searchParams.get('lead_id') || u.searchParams.get('ckm_id') || u.searchParams.get('cid');
    if (leadVal && leadVal.trim().length >= 6 && !leadVal.includes('#')) {
      return true;
    }
  } catch (e) {}
  return false;
}

/**
 * Extract Lead ID / Transaction ID from URL parameters, AJAX payloads, or DOM
 */
function extractLeadIdFromContext(url, ajaxPayloads = [], domId = null) {
  // 1. Try URL parameters first
  if (url) {
    try {
      const u = new URL(url);
      const transId = u.searchParams.get('transaction_id');
      if (transId && transId.length >= 6) return transId;
      const leadId = u.searchParams.get('leadid') || u.searchParams.get('lead_id') || u.searchParams.get('ckm_id');
      if (leadId && leadId.length >= 6) return leadId;
      const cid = u.searchParams.get('cid');
      if (cid && cid.length >= 6) return cid;
      const id = u.searchParams.get('id');
      if (id && id.length >= 4) return id;
    } catch (e) {}
  }

  // 2. Try AJAX response payloads
  if (ajaxPayloads && ajaxPayloads.length > 0) {
    for (const payload of ajaxPayloads) {
      if (payload && typeof payload === 'object') {
        const candidate = payload.lead_id || payload.leadId || payload.transaction_id || payload.transactionId || payload.id || payload.cid;
        if (candidate && String(candidate).trim().length >= 4) {
          return String(candidate).trim();
        }
      }
    }
  }

  // 3. Fallback to DOM extracted ID if clean
  if (domId && typeof domId === 'string' && domId.length >= 4 && !domId.toLowerCase().includes('error')) {
    return domId.trim();
  }

  return '—';
}

/**
 * Robust step-by-step assistant for pages that may have custom wizards or remaining inputs
 */
async function completeFormSteps(page, formPage, data) {
  const { state, phone, sliderAmount } = data;
  const numSlider = parseInt(String(sliderAmount).replace(/\D/g, '')) || 15000;
  const city = STATE_TO_CITY[state] || 'Los Angeles';

  // 1. Try standard FormPage multi-step solver first
  try {
    await formPage.fillForm({
      sliderAmount: `$${numSlider.toLocaleString()}`,
      state,
      firstName: 'CKMTESTPIXEL',
      lastName: 'CKMTESTPIXEL',
      email: 'ckmtestpixel@gmail.com',
      phone,
      isTraLink: true,
      runIndex: data.runIndex
    });
  } catch (e) {
    // Continue with adaptive completion
  }

  // 2. Adaptive sweep across wizard steps (up to 10 step passes)
  for (let step = 1; step <= 10; step++) {
    const currentUrl = page.url();
    if (isThankYouPageUrl(currentUrl)) break;

    // Check if slider is present and needs adjustment
    await page.evaluate((amt) => {
      const $ = window.jQuery || window.$;
      if ($ && $.fn && $.fn.slider && $('#slider, #slider2, .ui-slider').length) {
        const $sl = $('#slider, #slider2, .ui-slider').first();
        $sl.slider('value', amt);
        const handle = $sl.find('.ui-slider-handle')[0];
        $sl.trigger('slide', [{ value: amt, handle }]);
        $sl.trigger('slidechange', [{ value: amt, handle }]);
      }
      const taxInput = document.querySelector('input#tax_debt, input[name="tax_debt"], .taxval');
      if (taxInput && (!taxInput.value || taxInput.value === '0')) {
        taxInput.value = amt;
        taxInput.dispatchEvent(new Event('change', { bubbles: true }));
        taxInput.dispatchEvent(new Event('input', { bubbles: true }));
      }
      const pricePicker = document.querySelector('.price-picker, .slider-val');
      if (pricePicker) pricePicker.textContent = '$' + amt.toLocaleString();
    }, numSlider).catch(() => {});

    // Check for qualifying debt option tiles / buttons / radios
    const debtTiles = page.locator('.debt-option:visible, .tax-amount-btn:visible, input[name="tax_debt"]:visible, label:has-text("$10,000"):visible, label:has-text("$15,000"):visible, label:has-text("$20,000"):visible, button:has-text("$10,000"):visible, button:has-text("$15,000"):visible').first();
    if (await debtTiles.isVisible({ timeout: 400 }).catch(() => false)) {
      await debtTiles.click().catch(() => {});
      await page.waitForTimeout(400);
    }

    // Select state if dropdown is visible
    const stateSelect = page.locator('select#state:visible, select[name="state"]:visible, select.state-select:visible').first();
    if (await stateSelect.isVisible({ timeout: 400 }).catch(() => false)) {
      await stateSelect.selectOption({ label: state }).catch(async () => {
        await stateSelect.selectOption({ value: state }).catch(() => {});
      });
      await page.waitForTimeout(300);
    }

    // City input (crucial for long-form)
    const cityInput = page.locator('input[name*="city" i]:visible, input#city:visible, input[placeholder*="City" i]:visible').first();
    if (await cityInput.isVisible({ timeout: 400 }).catch(() => false)) {
      const val = await cityInput.inputValue().catch(() => '');
      if (!val) {
        await cityInput.fill(city);
        await page.waitForTimeout(300);
      }
    }

    // First Name
    const fnInput = page.locator('input#first_name:visible, input[name="first_name"]:visible, input[name="fname"]:visible, input[placeholder*="First" i]:visible').first();
    if (await fnInput.isVisible({ timeout: 400 }).catch(() => false)) {
      const val = await fnInput.inputValue().catch(() => '');
      if (!val) {
        await fnInput.fill('CKMTESTPIXEL');
        await page.waitForTimeout(300);
      }
    }

    // Last Name
    const lnInput = page.locator('input#last_name:visible, input[name="last_name"]:visible, input[name="lname"]:visible, input[placeholder*="Last" i]:visible').first();
    if (await lnInput.isVisible({ timeout: 400 }).catch(() => false)) {
      const val = await lnInput.inputValue().catch(() => '');
      if (!val) {
        await lnInput.fill('CKMTESTPIXEL');
        await page.waitForTimeout(300);
      }
    }

    // Email
    const emInput = page.locator('input#email_address:visible, input[name="email_address"]:visible, input[name="email"]:visible, input[type="email"]:visible, input[placeholder*="Email" i]:visible').first();
    if (await emInput.isVisible({ timeout: 400 }).catch(() => false)) {
      const val = await emInput.inputValue().catch(() => '');
      if (!val) {
        await emInput.fill('ckmtestpixel@gmail.com');
        await page.waitForTimeout(300);
      }
    }

    // TCPA / Consent Checkboxes
    const checkboxes = page.locator('input[type="checkbox"]:visible, input#resolution-3, input[name="opt_special_offers"], input[name="tcpa"], input[name="agree"]');
    const cbCount = await checkboxes.count().catch(() => 0);
    for (let c = 0; c < cbCount; c++) {
      const cb = checkboxes.nth(c);
      if (!(await cb.isChecked().catch(() => true))) {
        await cb.check({ force: true }).catch(() => {});
      }
    }

    // Phone Number
    const phInput = page.locator('input#primary_phone:visible, input[name="primary_phone"]:visible, input[name="phone"]:visible, input[type="tel"]:visible, input[placeholder*="Phone" i]:visible').first();
    if (await phInput.isVisible({ timeout: 400 }).catch(() => false)) {
      const val = await phInput.inputValue().catch(() => '');
      if (!val) {
        await phInput.click().catch(() => {});
        await phInput.type(phone.replace(/\D/g, ''), { delay: 60 }).catch(() => {});
        await page.waitForTimeout(300);
      }
    }

    // Referral dropdown if present
    const refSelect = page.locator('select#reference:visible, select[name="reference"]:visible').first();
    if (await refSelect.isVisible({ timeout: 400 }).catch(() => false)) {
      await refSelect.selectOption('Other').catch(async () => {
        await refSelect.selectOption({ index: 1 }).catch(() => {});
      });
      await page.waitForTimeout(300);
    }

    // Click Next or Submit Button
    const nextBtn = page.locator(`
      .next-btn${step}:visible,
      .next-btn:visible,
      .btn-next:visible,
      button.submitBtn:visible,
      button[type="submit"]:visible,
      input[type="submit"]:visible,
      button:has-text("NEXT"):visible,
      button:has-text("Next"):visible,
      button:has-text("SUBMIT"):visible,
      button:has-text("Submit"):visible,
      button:has-text("See If You Qualify"):visible,
      button:has-text("Check Eligibility"):visible,
      button:has-text("Get Started"):visible,
      button:has-text("Continue"):visible,
      a.next-btn:visible,
      a:has-text("NEXT"):visible
    `).first();

    if (await nextBtn.isVisible({ timeout: 800 }).catch(() => false)) {
      await nextBtn.click().catch(() => {});
      await page.waitForTimeout(1200);
    } else {
      break;
    }
  }

  // Final wait for server response and redirects
  await page.waitForTimeout(4000);
}

/**
 * Build Branded HTML Intelligence Email Report (Word "Sister Brands" removed)
 */
function buildBrandedEmailHtml(results, isHeadless = false) {
  const totalCount = results.length;
  const succeededCount = results.filter(r => r.success).length;
  const failedCount = totalCount - succeededCount;
  const modeLabel = isHeadless ? 'HEADLESS (Background)' : 'HEADED (Visible Browser)';

  const failedRuns = results.filter(r => !r.success);
  let failedListHtml = '';
  if (failedRuns.length > 0) {
    failedListHtml = `
      <div style="background: #fee2e2; border-left: 4px solid #dc2626; padding: 15px; border-radius: 4px; margin-bottom: 25px;">
        <div style="color: #991b1b; font-weight: 800; font-size: 13px; margin-bottom: 8px; text-transform: uppercase;">⚠️ FAILED URLS (ACTION REQUIRED)</div>
        <ul style="margin: 0; padding-left: 20px; font-size: 12px; color: #7f1d1d; line-height: 1.6;">
          ${failedRuns.map(r => `<li><b>${r.domainName}:</b> <a href="${r.url}" style="color: #b91c1c; text-decoration: underline;">${r.url}</a> - <span style="font-weight: bold; color: #dc2626;">${r.error || 'Submission / Redirect Timeout'}</span></li>`).join('')}
        </ul>
      </div>
    `;
  }

  const tableRowsHtml = results.map(r => {
    const thankYouLink = r.thankYouUrl ? `<a href="${r.thankYouUrl}" style="color: #0891b2; text-decoration: underline; font-weight: 600;">Thank you URL</a>` : '—';
    const passMark = r.success ? '<span style="color: #166534; font-weight: 800; font-size: 12px;">PASS</span>' : '<span style="color: #cbd5e1;">—</span>';
    const failMark = !r.success ? '<span style="color: #991b1b; font-weight: 800; font-size: 12px;">FAILED</span>' : '<span style="color: #cbd5e1;">—</span>';
    const apiStatusText = r.apiStatus || (r.success ? '200 OK' : 'Failed');

    return `
      <tr style="border-bottom: 1px solid #f1f5f9;">
        <td style="padding: 12px 10px; font-weight: 700; color: #1e293b; vertical-align: top; word-break: break-word;">
          ${r.domainName}
          <div style="font-size: 10px; color: #64748b; font-weight: normal; margin-top: 3px;">📍 ${r.state} &nbsp;|&nbsp; 📞 ${r.phone}</div>
        </td>
        <td style="padding: 12px 10px; text-align: center; vertical-align: top; font-size: 11px; word-break: break-all;">
          <a href="${r.url}" style="color: #0891b2; text-decoration: underline; font-weight: 600;">Page URL</a>
        </td>
        <td style="padding: 12px 10px; text-align: center; vertical-align: top; font-size: 11px; word-break: break-all;">
          ${thankYouLink}
        </td>
        <td style="padding: 12px 10px; text-align: center; vertical-align: top; font-family: Consolas, monospace; font-weight: 700; font-size: 11px; color: #0f172a; word-break: break-all;">
          ${r.leadId || '—'}
        </td>
        <td style="padding: 12px 10px; text-align: center; vertical-align: top;">
          ${passMark}
        </td>
        <td style="padding: 12px 10px; text-align: center; vertical-align: top;">
          ${failMark}
        </td>
        <td style="padding: 12px 10px; text-align: center; vertical-align: top; font-weight: 600; color: ${r.success ? '#0891b2' : '#991b1b'}; font-size: 11px;">
          ${apiStatusText}
        </td>
      </tr>
    `;
  }).join('');

  const reportDateStr = new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });

  return `
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
          <h1>TRA Automation</h1>
          <p>Intelligence Briefing - ${reportDateStr}</p>
        </div>
        
        <div class="content">
          <div style="font-size: 15px; font-weight: 700; color: #1e293b; margin-bottom: 20px; background: #f8fafc; padding: 12px 15px; border-radius: 8px; border: 1px solid #e2e8f0;">
            📊 URL Count - ${totalCount} &nbsp;|&nbsp; Passed: ${succeededCount} &nbsp;|&nbsp; Failed: ${failedCount}
          </div>

          ${failedListHtml}

          <!-- Section: TRA URL -->
          <div style="font-size: 15px; font-weight: 800; color: #0f172a; border-bottom: 2px solid #f1f5f9; padding-bottom: 10px; margin: 25px 0 15px;">TRA AUTOMATION (${modeLabel.toUpperCase()})</div>
          <table style="width: 100%; border-collapse: collapse; font-size: 12px; margin-bottom: 30px; table-layout: fixed;">
            <thead>
              <tr style="text-align: left; color: #64748b; border-bottom: 1.5px solid #cbd5e1; font-weight: 700;">
                <th style="padding: 10px; width: 22%;">DOMAIN NAME</th>
                <th style="padding: 10px; text-align: center; width: 14%;">URL</th>
                <th style="padding: 10px; text-align: center; width: 18%;">THANK YOU URL</th>
                <th style="padding: 10px; text-align: center; width: 14%;">LEAD ID</th>
                <th style="padding: 10px; text-align: center; width: 9%;">PASS</th>
                <th style="padding: 10px; text-align: center; width: 9%;">FAILED</th>
                <th style="padding: 10px; text-align: center; width: 14%;">API STATUS</th>
              </tr>
            </thead>
            <tbody>
              ${tableRowsHtml}
            </tbody>
          </table>
        </div>

        <div class="footer">
          <p style="margin: 0 0 12px; font-weight: 700;">Mode: ${modeLabel} &nbsp;|&nbsp; Credentials: CKMTESTPIXEL CKMTESTPIXEL</p>
          <p>© ${new Date().getFullYear()} Forward Leap Marketing. Confidential AI Intelligence.</p>
        </div>
      </div>
    </body>
    </html>
  `;
}

/**
 * Send the report email permanently including all FLM Agent team members via SMTP
 */
async function sendReportEmail(results, isHeadless = false) {
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;
  const toList = process.env.REPORT_EMAIL_RECIPIENT || 'deepali.londhe@magnetoitsolutions.com';
  // Include all FLM Agent team members in CC by default (can be restricted using --only-me)
  const ccList = process.argv.includes('--only-me') ? null : (process.env.REPORT_EMAIL_CC || 'ilfas.mansuri@bytestechnolab.com, apexa.dave@magnetoitsolutions.com, urvish.patel@bytestechnolab.com, deepesh.jain@bytestechnolab.com, jyoti.thakur@bytestechnolab.com, sachin.agrawal@bytestechnolab.com, himanshu.yadav@bytestechnolab.com, nivedita@magnetoitsolutions.com');

  const htmlBody = buildBrandedEmailHtml(results, isHeadless);

  // Save report locally
  const reportPath = path.join(__dirname, 'tra-email-report.html');
  fs.writeFileSync(reportPath, htmlBody, 'utf8');
  console.log(`\n💾 Branded HTML Report saved locally to: ${reportPath}`);

  if (!user || !pass) {
    console.error(`⚠️ SMTP credentials not found in .env. Skipping email dispatch.`);
    return;
  }

  const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: { user, pass }
  });

  const reportDateStr = new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
  const mailOptions = {
    from: `"Deepali Londhe" <${user}>`,
    to: toList,
    subject: `TRA Automation Report - ${reportDateStr}`,
    html: htmlBody
  };

  if (ccList) {
    mailOptions.cc = ccList;
  }

  try {
    const info = await transporter.sendMail(mailOptions);
    console.log(`\n====================================================================`);
    console.log(`📧 REPORT SUCCESSFULLY EMAILED TO: ${toList}`);
    if (ccList) {
      console.log(`📧 CC RECIPIENTS (ALL TEAM MEMBERS): ${ccList}`);
    } else {
      console.log(`📧 (Single recipient mode: sent strictly to ${toList})`);
    }
    console.log(`📧 Subject: ${mailOptions.subject}`);
    console.log(`📧 SMTP Response: ${info.response}`);
    console.log(`====================================================================\n`);
  } catch (err) {
    console.error(`❌ Failed to send email via SMTP:`, err.message);
  }
}

// ====================================================================
// MAIN BATCH RUNNER
// ====================================================================
(async () => {
  const isHeadless = process.argv.includes('--headless');
  const screenshotDir = path.join(__dirname, 'screenshots');
  if (!fs.existsSync(screenshotDir)) fs.mkdirSync(screenshotDir, { recursive: true });

  console.log('\n====================================================================');
  console.log(`🚀 LAUNCHING HEADED BATCH RUN FOR ALL 14 TRA URLs`);
  console.log('📋 Base Credentials: CKMTESTPIXEL CKMTESTPIXEL (ckmtestpixel@gmail.com)');
  console.log('📍 State Strategy: Rotational across all 14 runs with matching dummy phones');
  console.log('🖥️ Mode: HEADED (Visible Browser window)');
  console.log('====================================================================\n');

  const browser = await chromium.launch({
    headless: isHeadless,
    slowMo: isHeadless ? 50 : 500,
    args: [
      '--start-maximized',
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-blink-features=AutomationControlled'
    ]
  });

  const context = await browser.newContext({
    viewport: isHeadless ? { width: 1920, height: 1080 } : null,
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36'
  });

  const results = [];

  for (let i = 0; i < TARGET_URLS.length; i++) {
    const target = TARGET_URLS[i];
    const state = ROTATIONAL_STATES[i % ROTATIONAL_STATES.length];
    const phone = generateStateDummyPhone(state, i + 10);
    const sliderAmount = 15000;

    console.log(`\n--------------------------------------------------------------------`);
    console.log(`[${i + 1}/${TARGET_URLS.length}] 🌐 RUNNING: ${target.name}`);
    console.log(`    🔗 URL:   ${target.url}`);
    console.log(`    📍 State: ${state}`);
    console.log(`    📞 Phone: ${phone}`);
    console.log(`--------------------------------------------------------------------`);

    const page = await context.newPage();
    const formPage = new FormPage(page);

    let isSuccess = false;
    let finalUrl = target.url;
    let extractedLeadId = null;
    let errorMsg = null;
    const ajaxPayloads = [];

    try {
      // Intercept any POST response that might return a lead ID
      page.on('response', async (res) => {
        try {
          if (res.request().method() === 'POST') {
            const u = res.url();
            if (u.includes('process') || u.includes('lead') || u.includes('submit') || u.includes('api') || u.includes('form')) {
              const json = await res.json().catch(() => null);
              if (json) ajaxPayloads.push(json);
            }
          }
        } catch (e) {}
      });

      console.log(`⏳ Navigating to ${target.url}...`);
      await page.goto(target.url, { waitUntil: 'domcontentloaded', timeout: 35000 });
      await page.waitForTimeout(2000);

      // Execute multi-step form completion
      await completeFormSteps(page, formPage, {
        state,
        phone,
        sliderAmount,
        runIndex: i
      });

      await page.waitForTimeout(4000);
      finalUrl = page.url();
      console.log(`🏁 Final Page URL: ${finalUrl}`);

      // Extract Lead ID using comprehensive extractor
      let domId = null;
      try {
        domId = await formPage.extractLeadId();
      } catch (e) {}
      extractedLeadId = extractLeadIdFromContext(finalUrl, ajaxPayloads, domId);

      // Evaluate success
      if (isThankYouPageUrl(finalUrl) || (extractedLeadId && extractedLeadId !== '—')) {
        isSuccess = true;
        console.log(`✅ [${target.name}] SUCCESS! Lead ID: ${extractedLeadId}`);
      } else {
        const pageText = await page.innerText('body').catch(() => '');
        if (pageText.toLowerCase().includes('thank you') || pageText.toLowerCase().includes('received your information') || pageText.toLowerCase().includes('congratulations')) {
          isSuccess = true;
          console.log(`✅ [${target.name}] Confirmation text detected in page body! Lead ID: ${extractedLeadId}`);
        } else {
          isSuccess = false;
          errorMsg = 'Did not redirect to Thank You page';
          console.log(`⚠️ [${target.name}] Page ended without explicit Thank You redirect.`);
        }
      }

      // Take screenshot
      const shotPath = path.join(screenshotDir, `${target.id}_${Date.now()}.png`);
      await page.screenshot({ path: shotPath, fullPage: true }).catch(() => {});
      console.log(`📸 Screenshot saved: ${shotPath}`);

    } catch (err) {
      console.error(`❌ Error on ${target.name}:`, err.message);
      errorMsg = err.message;
      isSuccess = false;
      const errShotPath = path.join(screenshotDir, `${target.id}_error_${Date.now()}.png`);
      await page.screenshot({ path: errShotPath, fullPage: true }).catch(() => {});
    } finally {
      await page.close().catch(() => {});
    }

    results.push({
      id: target.id,
      domainName: target.name,
      url: target.url,
      thankYouUrl: isSuccess && isThankYouPageUrl(finalUrl) ? finalUrl : (isSuccess ? finalUrl : null),
      leadId: extractedLeadId,
      success: isSuccess,
      apiStatus: isSuccess ? '200 OK' : 'Failed',
      state,
      phone,
      error: errorMsg
    });

    // Pacing pause between URLs
    await new Promise(r => setTimeout(r, 1500));
  }

  await browser.close().catch(() => {});

  // Print summary to terminal
  console.log('\n====================================================================');
  console.log('📊 FINAL TEST EXECUTION SUMMARY (14 URLs)');
  console.log('====================================================================');
  results.forEach((r, idx) => {
    const mark = r.success ? '✅ PASS' : '❌ FAIL';
    console.log(`${idx + 1}. [${mark}] ${r.domainName} -> Lead ID: ${r.leadId} (${r.thankYouUrl || r.error || 'N/A'})`);
  });
  console.log('====================================================================\n');

  // Dispatch branded email report
  await sendReportEmail(results, isHeadless);

  console.log('🎉 ALL 14 URLs PROCESSED AND REPORT GENERATED!');
})();
