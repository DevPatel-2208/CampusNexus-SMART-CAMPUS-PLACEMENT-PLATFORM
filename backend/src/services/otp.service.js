const { EmailOtp: EmailOtpModel, ResetOtp: ResetOtpModel } = require('../models/Misc');
const EmailOtp = EmailOtpModel;
const ResetOtp = ResetOtpModel;
const { randomOtp, sha256 } = require('../utils/crypto');
const { ApiError } = require('../utils/helpers');
const { sendMail, otpTemplate, emailVerificationTemplate, forgotPasswordTemplate } = require('./mail.service');

const OTP_TTL_MS = 10 * 60 * 1000;
const COOLDOWN_MS = 60 * 1000;
const MAX_ATTEMPTS = 5;

async function issueEmailOtp(user) {
  const last = await EmailOtp.findOne({ user: user._id, verifiedAt: null }).sort({ _id: -1 });
  if (last && Date.now() - new Date(last.lastSentAt).getTime() < COOLDOWN_MS) {
    const wait = Math.ceil((COOLDOWN_MS - (Date.now() - new Date(last.lastSentAt).getTime())) / 1000);
    const err = ApiError.locked(`Please wait ${wait} seconds before requesting another code.`);
    err.resendAfter = wait;
    throw err;
  }
  const code = randomOtp();
  const otp = await EmailOtp.create({ user: user._id, otpHash: sha256(code), expiresAt: new Date(Date.now() + OTP_TTL_MS), attempts: 0, lastSentAt: new Date() });

  try {
    const result = await sendMail(user.email, `${code} is your CampusNexus verification code`, emailVerificationTemplate(code, 10));
    if (!result?.sent) throw new Error('No email provider accepted the verification code');
    await EmailOtp.updateMany({ user: user._id, _id: { $ne: otp._id }, verifiedAt: null }, { verifiedAt: new Date() });
    console.log(`[otp:delivery] user=${user._id} sent=true`);
  } catch (err) {
    await EmailOtp.deleteOne({ _id: otp._id });
    console.error(`[otp:send-error] user=${user._id}:`, err.message);
    throw new ApiError(503, 'We could not send the verification email. Please try again shortly.');
  }

  if (process.env.NODE_ENV !== 'production') console.log(`[otp:dev] verify user=${user._id} code=${code}`);
  return { otpId: otp._id, mailSent: true };
}

async function verifyEmailOtp(user, code) {
  const otp = await EmailOtp.findOne({ user: user._id, verifiedAt: null }).sort({ _id: -1 });
  if (!otp || otp.expiresAt <= new Date()) throw ApiError.gone('This code has expired. Please request a new one.');
  if (otp.attempts >= MAX_ATTEMPTS) throw ApiError.locked('Too many wrong attempts — please request a new code.');
  const ok = otp.otpHash === sha256(String(code).trim());
  if (!ok) {
    otp.attempts += 1; await otp.save();
    const left = Math.max(0, MAX_ATTEMPTS - otp.attempts);
    throw ApiError.badRequest(left > 0 ? `Invalid code. You have ${left} attempt(s) left.` : 'Invalid code. Too many attempts — please request a new code.');
  }
  otp.verifiedAt = new Date(); await otp.save();
  return otp;
}

async function issueResetOtp(email, role) {
  const last = await ResetOtp.findOne({ email: email.toLowerCase(), role, verifiedAt: null }).sort({ _id: -1 });
  if (last && Date.now() - new Date(last.lastSentAt).getTime() < COOLDOWN_MS) {
    const wait = Math.ceil((COOLDOWN_MS - (Date.now() - new Date(last.lastSentAt).getTime())) / 1000);
    const err = ApiError.locked(`Please wait ${wait} seconds before requesting another code.`);
    err.resendAfter = wait;
    throw err;
  }
  const code = randomOtp();
  const otp = await ResetOtp.create({ email: email.toLowerCase(), role, otpHash: sha256(code), expiresAt: new Date(Date.now() + OTP_TTL_MS), attempts: 0, lastSentAt: new Date() });

  try {
    const result = await sendMail(email, `Reset your CampusNexus password: ${code}`, forgotPasswordTemplate(code, 10));
    if (!result?.sent) throw new Error('No email provider accepted the password reset code');
    await ResetOtp.updateMany({ email: email.toLowerCase(), role, _id: { $ne: otp._id }, verifiedAt: null }, { verifiedAt: new Date() });
    console.log('[otp:reset:delivery] sent=true');
  } catch (err) {
    await ResetOtp.deleteOne({ _id: otp._id });
    console.error('[otp:reset:send-error]', err.message);
    throw new ApiError(503, 'We could not send the password reset email. Please try again shortly.');
  }

  if (process.env.NODE_ENV !== 'production') console.log(`[otp:dev] reset email=${email} code=${code}`);
  return { mailSent: true };
}

async function verifyResetOtp(email, role, code) {
  const row = await ResetOtp.findOne({ email: email.toLowerCase(), role, verifiedAt: null }).sort({ _id: -1 });
  if (!row || row.expiresAt <= new Date()) throw ApiError.gone('This code has expired. Please request a new one.');
  if (row.attempts >= MAX_ATTEMPTS) throw ApiError.locked('Too many wrong attempts — please request a new code.');
  if (row.otpHash !== sha256(String(code).trim())) {
    row.attempts += 1; await row.save();
    const left = Math.max(0, MAX_ATTEMPTS - row.attempts);
    throw ApiError.badRequest(left > 0 ? `Invalid code. You have ${left} attempt(s) left.` : 'Invalid code. Too many attempts — please request a new code.');
  }
  row.verifiedAt = new Date(); await row.save();
  return row;
}

module.exports = { issueEmailOtp, verifyEmailOtp, issueResetOtp, verifyResetOtp, OTP_TTL_MS, MAX_ATTEMPTS };
