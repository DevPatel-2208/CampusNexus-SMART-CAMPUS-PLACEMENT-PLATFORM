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
      connectionTimeout: 8000,
      greetingTimeout: 8000,
      socketTimeout: 12000,
    });
  }
  if (!transporter) {
    transporter = nodemailer.createTransport({
      host: env.SMTP_HOST,
      port: env.SMTP_PORT,
      secure: env.SMTP_SECURE || env.SMTP_PORT === 465,
      auth: { user: env.SMTP_USER, pass: env.SMTP_PASS },
      tls: { rejectUnauthorized: env.NODE_ENV === 'production' },
      connectionTimeout: 8000,
      greetingTimeout: 8000,
      socketTimeout: 12000,
    });
  }
  return transporter;
}

async function sendMail(to, subject, html) {
  // 1. If BREVO_API_KEY is present, send via Brevo (Sendinblue) HTTPS REST API (Port 443 - no domain lock, 300 free/day)
  if (env.BREVO_API_KEY) {
    if (env.BREVO_API_KEY.startsWith('xsmtpsib-')) {
      console.error('[mail:brevo:error] Misconfigured key! The key starts with "xsmtpsib-", which is an SMTP password. Brevo REST API requires an API key starting with "xkeysib-" from https://app.brevo.com/settings/keys/api');
    }
    try {
      const senderEmail = env.BREVO_SENDER || env.SMTP_USER;
      if (!senderEmail) throw new Error('Set BREVO_SENDER to an email address verified in Brevo.');
      const senderName = 'CampusNexus';
      const res = await fetch('https://api.brevo.com/v3/smtp/email', {
        method: 'POST',
        headers: {
          'api-key': env.BREVO_API_KEY.trim(),
          'Content-Type': 'application/json',
          'Accept': 'application/json',
        },
        signal: AbortSignal.timeout(8000),
        body: JSON.stringify({
          sender: { name: senderName, email: senderEmail },
          to: [{ email: to }],
          subject,
          htmlContent: html,
        }),
      });
      const data = await res.json();
      if (res.ok && data?.messageId) {
        console.log(`[mail:brevo:sent] to=${to} messageId=${data.messageId}`);
        return { sent: true, messageId: data.messageId, provider: 'brevo' };
      }
      console.warn('[mail:brevo:warn] Brevo API rejected email delivery:', res.status, data);
    } catch (err) {
      console.error('[mail:brevo:error] Brevo fetch error:', err.message);
    }
  }

  // 2. If RESEND_API_KEY is present, send via Resend HTTPS REST API (Port 443)
  if (env.RESEND_API_KEY) {
    try {
      const res = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${env.RESEND_API_KEY}`,
          'Content-Type': 'application/json',
        },
        signal: AbortSignal.timeout(8000),
        body: JSON.stringify({
          from: env.RESEND_FROM || 'CampusNexus <onboarding@resend.dev>',
          to: [to],
          subject,
          html,
        }),
      });
      const data = await res.json();
      if (res.ok && data?.id) {
        console.log(`[mail:resend:sent] to=${to} messageId=${data.id}`);
        return { sent: true, messageId: data.id, provider: 'resend' };
      }
      console.warn('[mail:resend:warn] Resend API failed, falling back to SMTP:', data);
    } catch (err) {
      console.error('[mail:resend:error] Fallback to SMTP:', err.message);
    }
  }

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

function emailVerificationTemplate(code, minutes = 10) {
  const year = new Date().getFullYear();
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Verify Your CampusNexus Account</title>
</head>
<body style="margin: 0; padding: 0; background-color: #0b0f19; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #f1f5f9; -webkit-font-smoothing: antialiased;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color: #0b0f19; padding: 48px 16px;">
    <tr>
      <td align="center">
        <!-- Main Container -->
        <table role="presentation" width="100%" style="max-width: 540px; background-color: #111827; border-radius: 24px; border: 1px solid rgba(255, 255, 255, 0.12); box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.6); overflow: hidden;">
          <!-- Top Gradient Accent -->
          <tr>
            <td style="height: 5px; background: linear-gradient(90deg, #3b82f6 0%, #6366f1 50%, #a855f7 100%);"></td>
          </tr>
          
          <!-- Header / Brand -->
          <tr>
            <td style="padding: 40px 36px 24px; text-align: center;">
              <div style="display: inline-block; width: 52px; height: 52px; line-height: 52px; background: linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%); border-radius: 16px; color: #ffffff; font-weight: 800; font-size: 22px; box-shadow: 0 10px 25px -5px rgba(99, 102, 241, 0.5); margin-bottom: 16px;">
                CN
              </div>
              <h1 style="margin: 0; color: #ffffff; font-size: 24px; font-weight: 800; letter-spacing: -0.5px;">CampusNexus</h1>
              <p style="margin: 6px 0 0; color: #94a3b8; font-size: 12px; font-weight: 600; letter-spacing: 0.08em; text-transform: uppercase;">
                Smart Placement & Recruitment Platform
              </p>
            </td>
          </tr>

          <!-- Content Card -->
          <tr>
            <td style="padding: 0 36px 36px;">
              <div style="background: rgba(255, 255, 255, 0.025); border: 1px solid rgba(255, 255, 255, 0.08); border-radius: 20px; padding: 28px 24px; text-align: center;">
                <!-- Badge -->
                <div style="display: inline-block; padding: 6px 14px; background: rgba(99, 102, 241, 0.15); border: 1px solid rgba(99, 102, 241, 0.35); border-radius: 9999px; margin-bottom: 18px;">
                  <span style="font-size: 11px; font-weight: 700; color: #a5b4fc; letter-spacing: 0.06em; text-transform: uppercase;">
                    🔐 Account Verification
                  </span>
                </div>

                <h2 style="margin: 0 0 12px; color: #ffffff; font-size: 20px; font-weight: 700;">
                  Verify Your Email Address
                </h2>
                <p style="margin: 0 0 24px; color: #cbd5e1; font-size: 14px; line-height: 1.6;">
                  Welcome to <strong>CampusNexus</strong>! Use the one-time verification code below to verify your email and activate your placement account:
                </p>

                <!-- OTP Display Box -->
                <div style="background: #030712; border: 2px dashed #6366f1; border-radius: 14px; padding: 20px; margin: 0 auto 20px; max-width: 320px; box-shadow: inset 0 2px 8px rgba(0, 0, 0, 0.6);">
                  <div style="font-size: 38px; font-weight: 800; letter-spacing: 10px; color: #818cf8; font-family: 'Consolas', 'Courier New', monospace; padding-left: 10px;">
                    ${code}
                  </div>
                  <div style="margin-top: 6px; font-size: 11px; color: #64748b; font-weight: 600; text-transform: uppercase; letter-spacing: 0.08em;">
                    Single-Use Verification Code
                  </div>
                </div>

                <!-- Expiry Chip -->
                <p style="margin: 0 0 16px; color: #94a3b8; font-size: 13px; font-weight: 500;">
                  ⏱ Valid for <strong>${minutes} minutes</strong>.
                </p>

                <!-- Security Note -->
                <div style="background: rgba(15, 23, 42, 0.6); border-radius: 12px; border: 1px solid rgba(255, 255, 255, 0.05); padding: 12px 16px; text-align: left;">
                  <p style="margin: 0; color: #94a3b8; font-size: 12px; line-height: 1.5;">
                    <strong style="color: #e2e8f0;">Security Tip:</strong> Never share this code with anyone. CampusNexus administrators and placement coordinators will never ask for your verification code.
                  </p>
                </div>
              </div>

              <!-- Unsolicited request notice -->
              <p style="margin: 24px 0 0; color: #64748b; font-size: 12px; line-height: 1.5; text-align: center;">
                If you did not register for a CampusNexus account, you can safely ignore this email.
              </p>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="background-color: #0b0f19; border-top: 1px solid rgba(255, 255, 255, 0.06); padding: 24px; text-align: center;">
              <p style="margin: 0 0 6px; color: #64748b; font-size: 12px; font-weight: 500;">
                CampusNexus • Connecting Students, TPOs & Top Recruiters
              </p>
              <p style="margin: 0; color: #475569; font-size: 11px;">
                © ${year} CampusNexus Placement Platform. All rights reserved.
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

function forgotPasswordTemplate(code, minutes = 10) {
  const year = new Date().getFullYear();
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Reset Your CampusNexus Password</title>
</head>
<body style="margin: 0; padding: 0; background-color: #0b0f19; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #f1f5f9; -webkit-font-smoothing: antialiased;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color: #0b0f19; padding: 48px 16px;">
    <tr>
      <td align="center">
        <!-- Main Container -->
        <table role="presentation" width="100%" style="max-width: 540px; background-color: #111827; border-radius: 24px; border: 1px solid rgba(255, 255, 255, 0.12); box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.6); overflow: hidden;">
          <!-- Top Gradient Accent (Amber to Rose for Security Action) -->
          <tr>
            <td style="height: 5px; background: linear-gradient(90deg, #f59e0b 0%, #ec4899 50%, #8b5cf6 100%);"></td>
          </tr>
          
          <!-- Header / Brand -->
          <tr>
            <td style="padding: 40px 36px 24px; text-align: center;">
              <div style="display: inline-block; width: 52px; height: 52px; line-height: 52px; background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%); border-radius: 16px; color: #ffffff; font-weight: 800; font-size: 22px; box-shadow: 0 10px 25px -5px rgba(245, 158, 11, 0.4); margin-bottom: 16px;">
                🔑
              </div>
              <h1 style="margin: 0; color: #ffffff; font-size: 24px; font-weight: 800; letter-spacing: -0.5px;">CampusNexus</h1>
              <p style="margin: 6px 0 0; color: #94a3b8; font-size: 12px; font-weight: 600; letter-spacing: 0.08em; text-transform: uppercase;">
                Account Security Center
              </p>
            </td>
          </tr>

          <!-- Content Card -->
          <tr>
            <td style="padding: 0 36px 36px;">
              <div style="background: rgba(255, 255, 255, 0.025); border: 1px solid rgba(255, 255, 255, 0.08); border-radius: 20px; padding: 28px 24px; text-align: center;">
                <!-- Badge -->
                <div style="display: inline-block; padding: 6px 14px; background: rgba(245, 158, 11, 0.15); border: 1px solid rgba(245, 158, 11, 0.35); border-radius: 9999px; margin-bottom: 18px;">
                  <span style="font-size: 11px; font-weight: 700; color: #fcd34d; letter-spacing: 0.06em; text-transform: uppercase;">
                    Password Reset Request
                  </span>
                </div>

                <h2 style="margin: 0 0 12px; color: #ffffff; font-size: 20px; font-weight: 700;">
                  Reset Your Password
                </h2>
                <p style="margin: 0 0 24px; color: #cbd5e1; font-size: 14px; line-height: 1.6;">
                  We received a request to reset the password for your CampusNexus account. Use this one-time security code to authorize a new password:
                </p>

                <!-- OTP Display Box -->
                <div style="background: #030712; border: 2px dashed #f59e0b; border-radius: 14px; padding: 20px; margin: 0 auto 20px; max-width: 320px; box-shadow: inset 0 2px 8px rgba(0, 0, 0, 0.6);">
                  <div style="font-size: 38px; font-weight: 800; letter-spacing: 10px; color: #fbbf24; font-family: 'Consolas', 'Courier New', monospace; padding-left: 10px;">
                    ${code}
                  </div>
                  <div style="margin-top: 6px; font-size: 11px; color: #78716c; font-weight: 600; text-transform: uppercase; letter-spacing: 0.08em;">
                    Password Reset Code
                  </div>
                </div>

                <!-- Expiry Chip -->
                <p style="margin: 0 0 18px; color: #94a3b8; font-size: 13px; font-weight: 500;">
                  ⏱ This code expires in <strong>${minutes} minutes</strong>.
                </p>

                <!-- Warning / Alert Box -->
                <div style="background: rgba(239, 68, 68, 0.08); border-radius: 12px; border: 1px solid rgba(239, 68, 68, 0.25); padding: 14px 16px; text-align: left;">
                  <p style="margin: 0; color: #fca5a5; font-size: 12px; line-height: 1.55;">
                    <strong style="color: #ffffff;">Didn't request this change?</strong> If you didn't ask to reset your password, please ignore this email. Your password will remain unchanged and your account is secure.
                  </p>
                </div>
              </div>

              <!-- Support Note -->
              <p style="margin: 24px 0 0; color: #64748b; font-size: 12px; line-height: 1.5; text-align: center;">
                Need help? Contact your institution's Training and Placement Cell (TPO).
              </p>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="background-color: #0b0f19; border-top: 1px solid rgba(255, 255, 255, 0.06); padding: 24px; text-align: center;">
              <p style="margin: 0 0 6px; color: #64748b; font-size: 12px; font-weight: 500;">
                CampusNexus • Connecting Students, TPOs & Top Recruiters
              </p>
              <p style="margin: 0; color: #475569; font-size: 11px;">
                © ${year} CampusNexus Placement Platform. All rights reserved.
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

function escapeEmailHtml(value) {
  return String(value ?? '').replace(/[&<>"']/g, (char) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
  })[char]);
}

function notificationEmailTemplate(title, message, { actionUrl, type = 'general', recipientName = '' } = {}) {
  const safeTitle = escapeEmailHtml(title || 'CampusNexus update');
  const safeName = escapeEmailHtml(recipientName);
  const safeMessage = escapeEmailHtml(message).replace(/\r?\n/g, '<br>');
  const localOrigin = env.CORS_ORIGINS.find((origin) => /^http:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(origin));
  const productionOrigin = env.CORS_ORIGINS.find((origin) => !/^http:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(origin));
  const appOrigin = env.NODE_ENV === 'production'
    ? productionOrigin || env.CORS_ORIGINS[0] || 'https://campusnexus-placement-platform.netlify.app'
    : localOrigin || env.CORS_ORIGINS[0] || 'http://localhost:5173';
  let href = '';
  if (actionUrl) {
    try {
      const parsed = new URL(actionUrl, appOrigin);
      if (parsed.protocol === 'https:' || parsed.protocol === 'http:') href = parsed.toString();
    } catch { /* omit an invalid action URL */ }
  }
  const actionLabel = title?.toLowerCase().includes('new application')
    ? 'Review applications'
    : type === 'application' ? 'View application' : 'Open CampusNexus';
  const year = new Date().getFullYear();

  return `<!doctype html>
<html lang="en">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"><title>${safeTitle}</title></head>
<body style="margin:0;padding:0;background:#f3f5fb;font-family:Arial,Helvetica,sans-serif;color:#172033;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#f3f5fb;padding:32px 12px;">
    <tr><td align="center">
      <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:580px;background:#ffffff;border:1px solid #e5e9f2;border-radius:18px;overflow:hidden;">
        <tr><td style="height:5px;background:#5b4bef;font-size:0;line-height:0;">&nbsp;</td></tr>
        <tr><td style="padding:26px 28px 18px;">
          <table role="presentation" cellspacing="0" cellpadding="0"><tr>
            <td align="center" valign="middle" width="40" height="40" style="width:40px;height:40px;border-radius:12px;background:#5b4bef;color:#ffffff;font-size:15px;font-weight:bold;">CN</td>
            <td style="padding-left:11px;color:#172033;font-size:18px;font-weight:700;">CampusNexus</td>
          </tr></table>
        </td></tr>
        <tr><td style="padding:12px 28px 30px;">
          <p style="margin:0 0 10px;color:#6558e8;font-size:11px;font-weight:700;letter-spacing:1.3px;text-transform:uppercase;">${escapeEmailHtml(type)} update</p>
          <h1 style="margin:0 0 14px;color:#172033;font-size:24px;line-height:1.3;">${safeTitle}</h1>
          ${safeName ? `<p style="margin:0 0 12px;color:#47536b;font-size:15px;line-height:1.6;">Hello ${safeName},</p>` : ''}
          <p style="margin:0;color:#47536b;font-size:15px;line-height:1.7;">${safeMessage}</p>
          ${href ? `<table role="presentation" cellspacing="0" cellpadding="0" style="margin-top:24px;"><tr><td bgcolor="#5b4bef" style="border-radius:10px;"><a href="${escapeEmailHtml(href)}" style="display:inline-block;padding:12px 18px;color:#ffffff;font-size:14px;font-weight:700;text-decoration:none;">${actionLabel}</a></td></tr></table>` : ''}
        </td></tr>
        <tr><td style="padding:18px 28px;border-top:1px solid #edf0f6;color:#7a8499;font-size:12px;line-height:1.6;">
          You received this message because of activity on your CampusNexus account.<br>
          &copy; ${year} CampusNexus · Campus Placement Management
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;
}

function otpTemplate(code, purpose, minutes = 10) {
  if (purpose && purpose.toLowerCase().includes('password')) {
    return forgotPasswordTemplate(code, minutes);
  }
  return emailVerificationTemplate(code, minutes);
}

module.exports = { sendMail, otpTemplate, emailVerificationTemplate, forgotPasswordTemplate, notificationEmailTemplate };
