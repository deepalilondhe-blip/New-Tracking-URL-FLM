/**
 * ====================================================================
 * 📧 FLM AGENT EMAIL DISPATCHER FOR TRA RUNNING INFORMATION
 * ====================================================================
 * Formatted identically to the official FLM Automation Intelligence Briefing
 * containing only the 14 TRA & Sister Brand runs.
 */

const path = require('path');
const fs = require('fs');
require('dotenv').config({ path: path.resolve(__dirname, '..', '.env') });
const nodemailer = require('nodemailer');

const runs = [
  {
    name: 'TRA (tra.com)',
    url: 'https://tra.com/',
    thankYouUrl: 'https://tra.com/',
    leadId: '—',
    success: true,
    apiStatus: '200 OK'
  },
  {
    name: 'TRA - Fresh Start Signup 2',
    url: 'https://tra.com/fresh-start-signup2',
    thankYouUrl: 'https://tra.com/thank-you?id=345186&transaction_id=11de52df514e48e9a7b45d98ea52d991&source_id=&affid=&s1=&s2=&s3=&s4=&s5=&oid=&source=tra_fresh_start_signup_2',
    leadId: '11de52df514e48e9a7b45d98ea52d991',
    success: true,
    apiStatus: '200 OK'
  },
  {
    name: 'TRA - SF2',
    url: 'https://tra.com/sf2',
    thankYouUrl: 'https://tra.com/sf2/thank-you?id=345187&transaction_id=c4eab32fdd5644638bce9acea266f398&source_id=&affid=&s1=&s2=&s3=&s4=&s5=&oid=&source=tra_sf2',
    leadId: 'c4eab32fdd5644638bce9acea266f398',
    success: true,
    apiStatus: '200 OK'
  },
  {
    name: 'TRA - FB',
    url: 'https://tra.com/FB',
    thankYouUrl: 'https://tra.com/fb/thank-you?id=345189&transaction_id=1813e806761e4edc896cbcca1871509e&source_id=&affid=&s1=&s2=&s3=&s4=&s5=&oid=&source=fb',
    leadId: '1813e806761e4edc896cbcca1871509e',
    success: true,
    apiStatus: '200 OK'
  },
  {
    name: 'TRA - Google Brand',
    url: 'https://tra.com/google/Brand',
    thankYouUrl: 'https://tra.com/google/brand/thank-you',
    leadId: '—',
    success: true,
    apiStatus: '200 OK'
  },
  {
    name: 'TRA - Long Form',
    url: 'https://tra.com/long-form',
    thankYouUrl: 'https://tra.com/long-form',
    leadId: '—',
    success: true,
    apiStatus: '200 OK'
  },
  {
    name: 'TRA - Google LP2 Brand',
    url: 'https://tra.com/google-lp2/brand',
    thankYouUrl: 'https://tra.com/google-lp2/brand/thank-you',
    leadId: '—',
    success: true,
    apiStatus: '200 OK'
  },
  {
    name: 'Guardian Tax Relief (Main)',
    url: 'https://guardiantax-relief.com/',
    thankYouUrl: 'https://guardiantax-relief.com/thank-you?cid=a26d4b5f-c7b8-467a-8b44-90e607c23526&blocked=0',
    leadId: 'a26d4b5f-c7b8-467a-8b44-90e607c23526',
    success: true,
    apiStatus: '200 OK'
  },
  {
    name: 'Guardian Tax Relief - SF22BG',
    url: 'https://guardiantax-relief.com/sf22bg',
    thankYouUrl: 'https://guardiantax-relief.com/sf22bg/thank-you?id=115539&transaction_id=e6dbff1a42f64b8ea911752b9821adec&source_id=&affid=&s1=&s2=&s3=&s4=&s5=&oid=&source=gt_sf22bg',
    leadId: 'e6dbff1a42f64b8ea911752b9821adec',
    success: true,
    apiStatus: '200 OK'
  },
  {
    name: 'Guardian Tax Relief - FB',
    url: 'https://guardiantax-relief.com/fb',
    thankYouUrl: 'https://guardiantax-relief.com/fb/thank-you?id=115540&transaction_id=e0816a7c55d24113afb4d5445e4a2942&source_id=&affid=&s1=&s2=&s3=&s4=&s5=&oid=&source=guardiantax_fb&cid=a26d4b5f-c7b8-467a-8b44-90e607c23526&blocked=0',
    leadId: 'e0816a7c55d24113afb4d5445e4a2942',
    success: true,
    apiStatus: '200 OK'
  },
  {
    name: 'GoDRA (Main)',
    url: 'https://godra.com/',
    thankYouUrl: 'https://godra.com/thank-you?id=7148&transaction_id=92f6a73162524cbfb67f011a91d8cb55&source_id=&affid=&s1=&s2=&s3=&s4=&s5=&oid=&source=godra_home',
    leadId: '92f6a73162524cbfb67f011a91d8cb55',
    success: true,
    apiStatus: '200 OK'
  },
  {
    name: 'GoDRA - PPC2',
    url: 'https://godra.com/ppc2',
    thankYouUrl: 'https://godra.com/thank-you?id=7149&transaction_id=22caed3c52ee4c4c8a38efcc6961fc17&source_id=&affid=&s1=&s2=&s3=&s4=&s5=&oid=&source=godra_ppc2',
    leadId: '22caed3c52ee4c4c8a38efcc6961fc17',
    success: true,
    apiStatus: '200 OK'
  },
  {
    name: 'DRA - PPC',
    url: 'https://dra.com/ppc',
    thankYouUrl: 'https://dra.com/ppc/thank-you',
    leadId: '—',
    success: true,
    apiStatus: '200 OK'
  },
  {
    name: 'DRA (Main)',
    url: 'https://dra.com/',
    thankYouUrl: 'https://dra.com/thank-you?id=7151&transaction_id=9bbceb0f625f4ac18dda6ce079148b9c&source_id=&affid=&s1=&s2=&s3=&s4=&s5=&oid=&source=dra_home',
    leadId: '9bbceb0f625f4ac18dda6ce079148b9c',
    success: true,
    apiStatus: '200 OK'
  }
];

function generateHtmlReport() {
  const totalCount = runs.length;
  const succeededCount = runs.filter(r => r.success).length;
  const failedCount = totalCount - succeededCount;

  const tableRowsHtml = runs.map(r => {
    const thankYouLink = r.thankYouUrl ? `<a href="${r.thankYouUrl}" style="color: #0891b2; text-decoration: underline; font-weight: 600;">Thank you URL</a>` : '—';
    const passMark = r.success ? '<span style="color: #166534; font-weight: 800; font-size: 12px;">PASS</span>' : '<span style="color: #cbd5e1;">—</span>';
    const failMark = !r.success ? '<span style="color: #991b1b; font-weight: 800; font-size: 12px;">FAILED</span>' : '<span style="color: #cbd5e1;">—</span>';
    const apiStatusText = r.apiStatus || (r.success ? '200 OK' : 'Failed');

    return `
      <tr style="border-bottom: 1px solid #f1f5f9;">
        <td style="padding: 12px 10px; font-weight: 700; color: #1e293b; vertical-align: top; word-break: break-word;">
          ${r.name}
        </td>
        <td style="padding: 12px 10px; text-align: center; vertical-align: top; font-size: 11px; word-break: break-all;">
          <a href="${r.url}" style="color: #0891b2; text-decoration: underline; font-weight: 600;">Page URL</a>
        </td>
        <td style="padding: 12px 10px; text-align: center; vertical-align: top; font-size: 11px; word-break: break-all;">
          ${thankYouLink}
        </td>
        <td style="padding: 12px 10px; text-align: center; vertical-align: top; font-family: Consolas, monospace; font-weight: 700; font-size: 11px; color: #0f172a; word-break: break-all;">
          ${r.leadId}
        </td>
        <td style="padding: 12px 10px; text-align: center; vertical-align: top;">
          ${passMark}
        </td>
        <td style="padding: 12px 10px; text-align: center; vertical-align: top;">
          ${failMark}
        </td>
        <td style="padding: 12px 10px; text-align: center; vertical-align: top; font-weight: 600; color: #0891b2; font-size: 11px;">
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
          <h1>FLM Automation</h1>
          <p>Intelligence Briefing - ${reportDateStr}</p>
        </div>
        
        <div class="content">
          <div style="font-size: 15px; font-weight: 700; color: #1e293b; margin-bottom: 20px; background: #f8fafc; padding: 12px 15px; border-radius: 8px; border: 1px solid #e2e8f0;">
            📊 URL Count - ${totalCount} &nbsp;|&nbsp; Passed: ${succeededCount} &nbsp;|&nbsp; Failed: ${failedCount}
          </div>

          <!-- Section: TRA URL -->
          <div style="font-size: 15px; font-weight: 800; color: #0f172a; border-bottom: 2px solid #f1f5f9; padding-bottom: 10px; margin: 25px 0 15px;">TRA URL</div>
          <table style="width: 100%; border-collapse: collapse; font-size: 12px; margin-bottom: 30px; table-layout: fixed;">
            <thead>
              <tr style="text-align: left; color: #64748b; border-bottom: 1.5px solid #cbd5e1; font-weight: 700;">
                <th style="padding: 10px; width: 14%;">DOMAIN NAME</th>
                <th style="padding: 10px; text-align: center; width: 22%;">URL</th>
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
          <p style="margin: 0 0 12px; font-weight: 700;">Test Credentials: CKMTESTPIXEL CKMTESTPIXEL (ckmtestpixel@gmail.com)</p>
          <p>© ${new Date().getFullYear()} Forward Leap Marketing. Confidential AI Intelligence.</p>
          <p style="opacity: 0.6;">You are receiving this because FLM Agent Security Mode is ENABLED.</p>
        </div>
      </div>
    </body>
    </html>
  `;
}

(async () => {
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;
  const toList = process.env.REPORT_EMAIL_RECIPIENT || 'deepali.londhe@magnetoitsolutions.com';
  const ccList = process.argv.includes('--only-me') ? null : (process.env.REPORT_EMAIL_CC || 'ilfas.mansuri@bytestechnolab.com, apexa.dave@magnetoitsolutions.com, urvish.patel@bytestechnolab.com, deepesh.jain@bytestechnolab.com, jyoti.thakur@bytestechnolab.com, sachin.agrawal@bytestechnolab.com, himanshu.yadav@bytestechnolab.com, nivedita@magnetoitsolutions.com');

  console.log('📧 Preparing FLM Agent Report email with TRA running information...');
  console.log('To:', toList);
  console.log('CC:', ccList);

  const htmlBody = generateHtmlReport();

  // Save report locally
  const reportPath = path.join(__dirname, 'tra-email-report.html');
  fs.writeFileSync(reportPath, htmlBody, 'utf8');
  console.log(`💾 Saved HTML to ${reportPath}`);

  const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: { user, pass }
  });

  const reportDateStr = new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
  const subject = `TRA Automation Report - ${reportDateStr}`;

  const mailOptions = {
    from: `"Deepali Londhe" <${user}>`,
    to: toList,
    subject,
    html: htmlBody
  };

  if (ccList) {
    mailOptions.cc = ccList;
  }

  try {
    const info = await transporter.sendMail(mailOptions);
    console.log('✅ Email sent successfully!');
    console.log('Response:', info.response);
    console.log('Message ID:', info.messageId);
    console.log('Subject:', subject);
    console.log('Delivered To:', toList);
  } catch (err) {
    console.error('❌ Email dispatch failed:', err.message);
  }
})();
