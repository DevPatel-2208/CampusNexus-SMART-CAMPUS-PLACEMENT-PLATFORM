/**
 * CampusNexus - SMTP & OTP Email Diagnostic Tool
 * Run with: node scripts/test-smtp.js [recipient-email]
 */

const nodemailer = require('nodemailer');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.join(__dirname, '../.env') });

const host = process.env.SMTP_HOST || 'smtp.gmail.com';
const port = Number(process.env.SMTP_PORT || 587);
const user = process.env.SMTP_USER || '';
const pass = process.env.SMTP_PASS || '';
const targetEmail = process.argv[2] || user || 'test@example.com';

console.log('====================================================');
console.log('       CAMPUSNEXUS SMTP & EMAIL DIAGNOSTIC        ');
console.log('====================================================');
console.log(`SMTP Host : ${host}`);
console.log(`SMTP Port : ${port}`);
console.log(`SMTP User : ${user}`);
console.log(`Password  : ${pass ? '••••••••' + pass.slice(-4) : '(NOT SET)'}`);
console.log(`Password Length: ${pass.length} chars`);
console.log(`Target    : ${targetEmail}`);
console.log('----------------------------------------------------');

if (!user || !pass) {
  console.error('❌ ERROR: SMTP_USER or SMTP_PASS is missing in backend/.env');
  process.exit(1);
}

const isGmail = host.toLowerCase().includes('gmail');
const transporter = nodemailer.createTransport(
  isGmail
    ? {
        service: 'gmail',
        auth: { user, pass },
      }
    : {
        host,
        port,
        secure: port === 465,
        auth: { user, pass },
      }
);

console.log('🔄 Step 1: Verifying SMTP credentials with mail server...');

transporter.verify(async (err, success) => {
  if (err) {
    console.error('\n❌ SMTP AUTHENTICATION FAILED:');
    console.error(err.message);
    if (err.message.includes('535') || err.message.includes('BadCredentials')) {
      console.log('\n💡 ROOT CAUSE & HOW TO FIX:');
      console.log('Gmail does NOT allow standard account passwords for SMTP.');
      console.log('You must generate a 16-character Google App Password:');
      console.log('1. Open: https://myaccount.google.com/apppasswords');
      console.log('   (Note: 2-Step Verification must be enabled on your Google Account)');
      console.log('2. Set App name as "CampusNexus" and click Create.');
      console.log('3. Google will give you a 16-character code (e.g. "abcd efgh ijkl mnop").');
      console.log('4. Paste that code into backend/.env as:');
      console.log('   SMTP_PASS=abcdefghijklmnop');
    }
    process.exit(1);
  }

  console.log('✅ SMTP Connection & Authentication Successful!');
  console.log(`🔄 Step 2: Sending test OTP verification email to ${targetEmail}...`);

  try {
    const info = await transporter.sendMail({
      from: `"CampusNexus" <${user}>`,
      to: targetEmail,
      subject: 'Your CampusNexus Verification Code is 742918',
      html: `
        <div style="font-family: sans-serif; padding: 20px; background: #0b0f19; color: #fff; border-radius: 12px; max-width: 480px;">
          <h2 style="color: #818cf8;">CampusNexus Verification</h2>
          <p>Your one-time security code is:</p>
          <div style="font-size: 32px; font-weight: bold; letter-spacing: 6px; color: #4f46e5; background: #fff; padding: 12px; border-radius: 8px; text-align: center;">742918</div>
          <p style="color: #94a3b8; font-size: 12px; margin-top: 16px;">This is a test email sent from CampusNexus SMTP verification test.</p>
        </div>
      `,
    });

    console.log('\n🎉 SUCCESS! Real Email Delivered!');
    console.log(`Message ID: ${info.messageId}`);
    console.log(`Check your inbox at: ${targetEmail}`);
    process.exit(0);
  } catch (sendErr) {
    console.error('\n❌ Sending failed:', sendErr.message);
    process.exit(1);
  }
});
