const nodemailer = require('nodemailer');
require('dotenv').config();

async function testMail465() {
  console.log('Testing SMTP connection with Port 465 (SSL):');
  console.log(`User: ${process.env.SMTP_USER}`);

  const transporter = nodemailer.createTransport({
    host: 'smtp.gmail.com',
    port: 465,
    secure: true, // SSL
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS
    }
  });

  try {
    console.log('Verifying SMTP Port 465 transporter...');
    await transporter.verify();
    console.log('✅ SMTP Port 465 successfully verified!');

    console.log('Sending test email...');
    const info = await transporter.sendMail({
      from: process.env.SMTP_USER,
      to: 'deepali.londhe@magnetoitsolutions.com',
      subject: '🛠️ Port 465 SMTP Test Email',
      text: 'If you are reading this, Gmail SMTP over Port 465 is working perfectly!'
    });
    console.log('✅ Test email sent successfully! MessageId:', info.messageId);
  } catch (error) {
    console.error('❌ Port 465 SMTP Test failed with error:', error);
  }
}

testMail465();
