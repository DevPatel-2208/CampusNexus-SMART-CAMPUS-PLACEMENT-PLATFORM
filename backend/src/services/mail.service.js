const nodemailer = require('nodemailer');
const env = require('../config/env');

let transporter = null;
function getTransporter() {
  if (!env.SMTP_HOST || !env.SMTP_USER || !env.SMTP_PASS) return null;
  if (!transporter) {
    transporter = nodemailer.createTransport({
      host: env.SMTP_HOST, port: env.SMTP_PORT, secure: env.SMTP_SECURE,
      auth: { user: env.SMTP_USER, pass: env.SMTP_PASS },
    });
  }
  return transporter;
}

async function sendMail(to, subject, html) {
  const tx = getTransporter();
  if (!tx) {
    if (env.NODE_ENV === 'production' && env.MAIL_REQUIRED) throw new Error('Email provider not configured');
    console.log(`[mail:dev] to=${to} subject=${subject}`);
    return { sent: false, dev: true };
  }
  try {
    await tx.sendMail({ from: env.MAIL_FROM, to, subject, html });
    return { sent: true };
  } catch (err) {
    console.error('[mail] send failed:', err.message);
    throw new Error('Failed to send email. Please try again later.');
  }
}

function otpTemplate(code, purpose, minutes) {
  return `<div style="font-family:sans-serif;max-width:480px"><h2>CareerConnect verification</h2><p>Your code to ${purpose}:</p><p style="font-size:28px;letter-spacing:6px"><b>${code}</b></p><p>This code expires in ${minutes} minutes. Never share it.</p></div>`;
}

module.exports = { sendMail, otpTemplate };
