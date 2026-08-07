const nodemailer = require('nodemailer');
const path = require('path');
const fs = require('fs');
const { execSync } = require('child_process');
require('dotenv').config({ path: path.resolve(__dirname, '..', '.env') });

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: parseInt(process.env.SMTP_PORT),
  secure: process.env.SMTP_SECURE === 'true',
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS
  }
});

async function run() {
  const zipPath = path.resolve(__dirname, '..', 'New_Tracking_URL_Backup.zip');
  
  console.log('📦 Creating ZIP archive of the project folder (excluding node_modules, traces, .git, .vscode, and playwright-report)...');
  try {
    // Run PowerShell Compress-Archive command
    const psCommand = `powershell -Command "Get-ChildItem -Path . -Exclude 'node_modules', '.git', '.vscode', 'traces', 'playwright-report', 'New_Tracking_URL_Backup.zip' | Compress-Archive -DestinationPath 'New_Tracking_URL_Backup.zip' -Force"`;
    execSync(psCommand, { cwd: path.resolve(__dirname, '..'), stdio: 'inherit' });
    console.log('✅ ZIP archive created successfully!');
  } catch (err) {
    console.error('❌ Failed to create ZIP archive:', err.message);
    process.exit(1);
  }

  console.log('📧 Preparing backup email...');
  const recipients = process.env.REPORT_EMAIL_RECIPIENT || 'deepali.londhe@magnetoitsolutions.com';
  
  const mailOptions = {
    from: `"FLM Automation Backup" <${process.env.SMTP_USER}>`,
    to: recipients,
    subject: `📦 PROJECT BACKUP: New Tracking URL Codebase`,
    html: `
      <div style="font-family: Arial, sans-serif; border: 1px solid #4caf50; padding: 20px; border-radius: 10px; background-color: #f9fff9;">
        <h2 style="color: #4caf50;">✅ Project Backup Successful</h2>
        <p>Your laptop automation code has been successfully backed up to your email.</p>
        <p><strong>File Attached:</strong> <code>New_Tracking_URL_Backup.zip</code></p>
        <p>In case your laptop ever crashes, you can download the attached zip file to restore your entire tracking URL project!</p>
        <hr/>
        <p style="font-size: 12px; color: #777;">This backup contains all configuration files, campaigns, page traversers, and scripts, excluding node_modules.</p>
      </div>
    `,
    attachments: [
      {
        filename: `New_Tracking_URL_Backup_${new Date().toISOString().split('T')[0]}.zip`,
        path: zipPath
      }
    ]
  };

  console.log(`📤 Sending backup email with attachment to: ${recipients}...`);
  try {
    const info = await transporter.sendMail(mailOptions);
    console.log('✨ Email sent successfully! Message ID:', info.messageId);
    
    console.log('Cleanup: Removing local ZIP archive...');
    fs.unlinkSync(zipPath);
    console.log('✅ Local cleanup finished successfully!');
  } catch (err) {
    console.error('❌ Failed to send backup email:', err.message);
    if (fs.existsSync(zipPath)) {
      fs.unlinkSync(zipPath);
    }
  }
}

run();
