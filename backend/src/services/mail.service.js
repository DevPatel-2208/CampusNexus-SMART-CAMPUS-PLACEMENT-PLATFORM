const nodemailer = require('nodemailer');
const env = require('../config/env');

let transporter = null;

function getTransporter() {
  if (!env.SMTP_USER || !env.SMTP_PASS) return null;
  const isGmail = (env.SMTP_HOST || '').toLowerCase().includes('gmail');
  if (isGmail) {
    // Gmail aggressively terminates idle pooled sockets. Fresh transport avoids socket hang-ups.
    return nodemailer.createTransport({
      service: 'gmail',
      auth: { user: env.SMTP_USER, pass: env.SMTP_PASS },
    });
  }
  if (!transporter) {
    transporter = nodemailer.createTransport({
      host: env.SMTP_HOST,
      port: env.SMTP_PORT,
      secure: env.SMTP_SECURE || env.SMTP_PORT === 465,
      auth: { user: env.SMTP_USER, pass: env.SMTP_PASS },
      tls: { rejectUnauthorized: env.NODE_ENV === 'production' },
    });
  }
  return transporter;
}

async function sendMail(to, subject, html) {
  const tx = getTransporter();
  // Always use authenticated SMTP_USER address if MAIL_FROM is missing or uses local domain
  const from = (env.SMTP_USER && (!env.MAIL_FROM || env.MAIL_FROM.includes('campusnexus.local')))
    ? `"CampusNexus" <${env.SMTP_USER}>`
    : (env.MAIL_FROM || (env.SMTP_USER ? `"CampusNexus" <${env.SMTP_USER}>` : '"CampusNexus" <no-reply@campusnexus.local>'));

  if (!tx) {
    if (env.NODE_ENV === 'production' && env.MAIL_REQUIRED) throw new Error('Email provider not configured');
    console.log(`[mail:dev:fallback] to=${to} subject=${subject}`);
    return { sent: false, dev: true };
  }

  try {
    const info = await tx.sendMail({ from, to, subject, html });
    console.log(`[mail:sent] to=${to} messageId=${info.messageId}`);
    return { sent: true, messageId: info.messageId };
  } catch (err) {
    console.error('[mail:error] Failed to send email:', err.message);
    // If a non-gmail pooled transporter failed with connection error, reset transporter and retry once
    try {
      transporter = null;
      const retryTx = getTransporter();
      if (retryTx) {
        const retryInfo = await retryTx.sendMail({ from, to, subject, html });
        console.log(`[mail:sent:retry] to=${to} messageId=${retryInfo.messageId}`);
        return { sent: true, messageId: retryInfo.messageId };
      }
    } catch (retryErr) {
      console.error('[mail:retry-error] Retry failed:', retryErr.message);
    }
    throw new Error(`Email delivery error: ${err.message}`);
  }
}

function otpTemplate(code, purpose, minutes = 10) {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>CampusNexus Security Code</title>
</head>
<body style="margin: 0; padding: 0; background-color: #0b0f19; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #f1f5f9;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color: #0b0f19; padding: 40px 16px;">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" style="max-width: 520px; background-color: #111827; border-radius: 20px; border: 1px solid rgba(255, 255, 255, 0.12); box-shadow: 0 20px 40px rgba(0, 0, 0, 0.5); overflow: hidden;">
          <!-- Top Accent Bar -->
          <tr>
            <td style="height: 4px; background: linear-gradient(90deg, #4f46e5, #9333ea, #ec4899);"></td>
          </tr>
          <!-- Header Banner -->
          <tr>
            <td style="padding: 36px 32px 20px; text-align: center;">
              <div style="display: inline-block; width: 48px; height: 48px; line-height: 48px; background: linear-gradient(135deg, #4f46e5, #7c3aed); border-radius: 14px; color: #ffffff; font-weight: 800; font-size: 20px; box-shadow: 0 8px 20px -4px rgba(79, 70, 229, 0.5); margin-bottom: 14px;">CN</div>
              <h1 style="margin: 0; color: #ffffff; font-size: 22px; font-weight: 800; letter-spacing: -0.5px;">CampusNexus</h1>
              <p style="margin: 6px 0 0; color: #94a3b8; font-size: 11px; font-weight: 700; letter-spacing: 0.08em; text-transform: uppercase;">Smart Campus Placement Platform</p>
            </td>
          </tr>
          <!-- Main Body -->
          <tr>
            <td style="padding: 10px 32px 32px;">
              <div style="background: rgba(255, 255, 255, 0.03); border: 1px solid rgba(255, 255, 255, 0.08); border-radius: 16px; padding: 24px; text-align: center;">
                <h2 style="margin: 0 0 10px; color: #ffffff; font-size: 19px; font-weight: 700;">One-Time Security Code</h2>
                <p style="margin: 0 0 22px; color: #cbd5e1; font-size: 14px; line-height: 1.55;">
                  Use this verification code to <strong>${purpose}</strong> on your CampusNexus account:
                </p>
                
                <!-- OTP Box -->
                <div style="background: #030712; border: 2px dashed rgba(99, 102, 241, 0.6); border-radius: 12px; padding: 18px 20px; margin: 0 auto 20px; max-width: 320px;">
                  <span style="font-size: 34px; font-weight: 800; letter-spacing: 8px; color: #818cf8; font-family: Consolas, 'Courier New', monospace; display: inline-block; padding-left: 8px;">${code}</span>
                </div>

                <p style="margin: 0; color: #94a3b8; font-size: 12px; font-weight: 500;">
                  ⏱ Valid for <strong>${minutes} minutes</strong>. Do not disclose this code to anyone.
                </p>
              </div>

              <p style="margin: 22px 0 0; color: #64748b; font-size: 12px; line-height: 1.5; text-align: center;">
                If you did not request this verification, your account may be safe and you can ignore this email.
              </p>
            </td>
          </tr>
          <!-- Footer -->
          <tr>
            <td style="background-color: #0b0f19; border-top: 1px solid rgba(255, 255, 255, 0.06); padding: 18px 24px; text-align: center;">
              <p style="margin: 0; color: #64748b; font-size: 11px;">
                © ${new Date().getFullYear()} CampusNexus • Connecting Talent. Creating Futures.
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

module.exports = { sendMail, otpTemplate };
