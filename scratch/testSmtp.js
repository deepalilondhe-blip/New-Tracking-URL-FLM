const nodemailer = require('nodemailer');
require('dotenv').config();

async function testMail() {
  console.log('Testing SMTP connection with:');
  console.log(`Host: ${process.env.SMTP_HOST}`);
  console.log(`Port: ${process.env.SMTP_PORT}`);
  console.log(`User: ${process.env.SMTP_USER}`);
  console.log(`Pass length: ${process.env.SMTP_PASS ? process.env.SMTP_PASS.length : 0} characters`);

  const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST || 'smtp.gmail.com',
    port: parseInt(process.env.SMTP_PORT || '587'),
    secure: process.env.SMTP_SECURE === 'true',
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS
    }
  });

  try {
    console.log('Verifying SMTP transporter...');
    await transporter.verify();
    console.log('✅ SMTP connection successfully verified!');

    console.log('Sending test email...');
    const info = await transporter.sendMail({
      from: process.env.SMTP_USER,
      to: 'deepali.londhe@magnetoitsolutions.com',
      subject: '🛠️ SMTP Test Email',
      text: 'If you are reading this, your Gmail SMTP App Password is working perfectly!'
    });
    console.log('✅ Test email sent successfully! MessageId:', info.messageId);
  } catch (error) {
    console.error('❌ SMTP Test failed with error:', error);
  }
}

testMail();
