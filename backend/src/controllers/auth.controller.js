const jwt = require('jsonwebtoken');
const User = require('../models/User');
const StudentProfile = require('../models/StudentProfile');
const CompanyProfile = require('../models/CompanyProfile');
const { ApiError, asyncHandler } = require('../utils/helpers');
const { hashPassword, verifyPassword, passwordStrengthError } = require('../utils/crypto');
const { signAccess, signRefresh, refreshCookieOptions } = require('../middleware/auth');
const { issueEmailOtp, verifyEmailOtp, issueResetOtp, verifyResetOtp: checkResetOtp } = require('../services/otp.service');
const { notifyTpos } = require('../services/notify.service');
const audit = require('../services/audit.service');
const env = require('../config/env');

const RESET_TTL_MS = 10 * 60 * 1000;
const REFRESH_GRACE_MS = 30 * 1000; // window in which a duplicate/concurrent refresh is accepted
const resetTokens = new Map(); // token -> { email, role, exp } (single-use)

function setRefresh(res, user) {
  res.cookie('cc_refresh', signRefresh(user), refreshCookieOptions());
}

const register = asyncHandler(async (req, res) => {
  const { name, email, password, confirm, role } = req.body;
  if (!['student', 'company'].includes(role)) throw ApiError.badRequest('TPO accounts are created and managed by the institution.');
  if (!name || !email || !password || !confirm) throw ApiError.badRequest('All fields are required.');
  if (password !== confirm) throw ApiError.badRequest('Passwords do not match.');
  if (password.length < 8 || !/[A-Za-z]/.test(password) || !/[0-9]/.test(password)) {
    throw ApiError.badRequest('Password must be at least 8 characters long and include both letters and numbers.');
  }
  const exists = await User.findOne({ email: email.toLowerCase() });
  if (exists) {
    if (exists.emailVerifiedAt && exists.status === 'active') {
      throw ApiError.conflict('An account with this email is already registered and verified. Please sign in instead.');
    }
    // Account exists but is unverified — update details, set active/inactive properly, and issue a fresh OTP
    exists.name = name;
    exists.password = await hashPassword(password);
    exists.role = role;
    exists.status = 'inactive';
    await exists.save();

    if (role === 'student') {
      await StudentProfile.findOneAndUpdate(
        { user: exists._id },
        { $setOnInsert: { enrollmentNo: 'ENR' + String(exists._id).slice(-6).padStart(6, '0'), profileCompletion: 20 } },
        { upsert: true }
      );
    } else {
      await CompanyProfile.findOneAndUpdate(
        { user: exists._id },
        { $set: { companyName: name, email: exists.email, verificationStatus: 'pending' } },
        { upsert: true }
      );
    }

    let mailSent = true;
    try { ({ mailSent } = await issueEmailOtp(exists)); } catch (e) { if (e.status !== 429) throw e; }
    audit('register_retry', 'auth', `Unverified user re-submitted registration; new OTP issued`, exists._id, req);
    return res.status(200).json({
      success: true,
      data: {
        userId: exists._id,
        email: exists.email,
        pendingVerification: true,
        alreadyExisted: true,
        mailSent,
      },
    });
  }

  const user = await User.create({ name, email: email.toLowerCase(), password: await hashPassword(password), role, status: 'inactive' });
  if (role === 'student') {
    await StudentProfile.create({ user: user._id, enrollmentNo: 'ENR' + String(user._id).slice(-6).padStart(6, '0'), profileCompletion: 20 });
  } else {
    await CompanyProfile.create({ user: user._id, companyName: name, email: user.email, verificationStatus: 'pending' });
    await notifyTpos('New company registered', `${name} registered and is pending verification.`, { type: 'company', referenceId: user._id, actionUrl: '/tpo/company-verification' });
  }
  let mailSent = true;
  try { ({ mailSent } = await issueEmailOtp(user)); } catch (e) { if (e.status !== 429) throw e; }
  audit('register', 'auth', `New ${role} registered; awaiting email verification`, user._id, req);
  res.status(201).json({ success: true, data: { userId: user._id, email: user.email, pendingVerification: true, mailSent } });
});

const login = asyncHandler(async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) throw ApiError.badRequest('Email and password are required.');
  const user = await User.findOne({ email: String(email).toLowerCase() }).select('+password');
  const ok = user ? await verifyPassword(password, user.password) : false;
  if (!user || !ok) throw ApiError.unauthorized('Unable to sign in. Please check your credentials and try again.');

  // If email was never verified, prompt for OTP verification regardless of inactive flag
  if (!user.emailVerifiedAt) {
    try { await issueEmailOtp(user); } catch (sendError) { if (sendError.status !== 429) throw sendError; }
    const err = ApiError.forbidden('Please verify your email first.');
    err.code = 'EMAIL_NOT_VERIFIED'; err.userId = user._id; err.email = user.email;
    throw err;
  }

  if (user.status !== 'active') throw ApiError.forbidden('Your account is currently inactive. Please contact your institution.');
  // Atomically flip firstLogin true->false. Only one concurrent request can match,
  // so simultaneous logins cannot both classify the user as first-time.
  const flip = await User.updateOne({ _id: user._id, firstLogin: true }, { $set: { firstLogin: false } });
  const isFirstLogin = flip.modifiedCount === 1;
  if (isFirstLogin) user.firstLogin = false; // keep in-memory doc consistent with DB
  user.lastLogin = new Date(); await user.save();
  setRefresh(res, user);
  const safe = user.toObject(); delete safe.password;
  audit('login', 'auth', `Login success (${user.role}) — ${user.name}${isFirstLogin ? ' (first login)' : ''}`, user._id, req);
  res.json({ success: true, data: { user: safe, accessToken: signAccess(user), isFirstLogin } });
});

const logout = asyncHandler(async (req, res) => {
  if (req.user) { req.user.tokenVersion += 1; await req.user.save(); audit('logout', 'auth', 'User logout', req.user._id, req); }
  res.clearCookie('cc_refresh', { ...refreshCookieOptions(), maxAge: 0 });
  res.json({ success: true, data: { message: 'Signed out' } });
});

const refresh = asyncHandler(async (req, res) => {
  const token = req.cookies?.cc_refresh;
  if (!token) {
    // No session cookie at all: answer "signed out" instead of 401. The SPA probes
    // this endpoint on every mount, and a 401 here would print a console/network
    // error for every anonymous visitor. Invalid/expired/revoked cookies still 401.
    return res.json({ success: true, data: { accessToken: null, authenticated: false } });
  }
  let payload;
  try { payload = jwt.verify(token, env.JWT_REFRESH_SECRET); }
  catch { throw ApiError.unauthorized('Session expired. Please sign in again.'); }
  if (payload.typ !== 'refresh') throw ApiError.unauthorized('Invalid session');
  const user = await User.findById(payload.sub).select('-password');
  if (!user || user.status !== 'active') throw ApiError.unauthorized('Account unavailable');
  if ((payload.tv ?? 0) !== (user.tokenVersion || 0)) throw ApiError.unauthorized('Session revoked. Please sign in again.');

  // Rotate atomically. Concurrent refreshes (React StrictMode double-mount, multiple
  // tabs) present the same token; only one wins the compare-and-set. The losers are
  // accepted if the rotation just happened, so they do not surface a spurious 401.
  const rv = payload.rv ?? 0;
  const now = new Date();
  const rotated = await User.updateOne(
    { _id: user._id, ...(rv === 0 ? { $or: [{ refreshVersion: 0 }, { refreshVersion: { $exists: false } }] } : { refreshVersion: rv }) },
    { $set: { refreshVersion: rv + 1, refreshRotatedAt: now } },
  );
  if (rotated.modifiedCount === 1) {
    user.refreshVersion = rv + 1; user.refreshRotatedAt = now;
  } else {
    const current = await User.findById(user._id).select('refreshVersion refreshRotatedAt');
    const withinGrace = current
      && (current.refreshVersion || 0) === rv + 1
      && current.refreshRotatedAt
      && now.getTime() - current.refreshRotatedAt.getTime() < REFRESH_GRACE_MS;
    if (!withinGrace) throw ApiError.unauthorized('Session revoked. Please sign in again.');
    user.refreshVersion = current.refreshVersion; user.refreshRotatedAt = current.refreshRotatedAt;
  }

  setRefresh(res, user);
  res.json({ success: true, data: { accessToken: signAccess(user) } });
});

const me = asyncHandler(async (req, res) => {
  const data = req.user.toObject();
  if (req.user.role === 'student') {
    const profile = await StudentProfile.findOne({ user: req.user._id });
    if (profile) {
      const prev = profile.profileCompletion;
      const next = profile.recalcCompletion();
      if (prev !== next) await profile.save();
    }
    data.profile = profile;
  }
  if (req.user.role === 'company') data.company = await CompanyProfile.findOne({ user: req.user._id });
  res.json({ success: true, data });
});

const verifyEmail = asyncHandler(async (req, res) => {
  const { userId, email, code } = req.body;
  if (!code) throw ApiError.badRequest('Verification code is required.');
  const user = userId ? await User.findById(userId) : await User.findOne({ email: String(email || '').toLowerCase() });
  if (!user) throw ApiError.badRequest('Invalid verification request.');
  await verifyEmailOtp(user, code);
  user.status = 'active'; user.emailVerifiedAt = new Date(); await user.save();
  audit('email_verified', 'auth', `Email verified (OTP) — ${user.email}`, user._id, req);
  res.json({ success: true, data: { message: 'Email verified. You can now sign in.' } });
});

const resendOtp = asyncHandler(async (req, res) => {
  const { userId, email } = req.body;
  const user = userId ? await User.findById(userId) : await User.findOne({ email: String(email || '').toLowerCase() });
  if (!user) throw ApiError.badRequest('Invalid request.');
  if (user.emailVerifiedAt && user.status === 'active') throw ApiError.badRequest('Email is already verified.');
  const { mailSent } = await issueEmailOtp(user);
  res.json({ success: true, data: { message: 'Verification code sent.', mailSent } });
});

const forgotPassword = asyncHandler(async (req, res) => {
  const { email, role } = req.body;
  const user = await User.findOne({ email: String(email || '').toLowerCase(), ...(role ? { role } : {}) });
  // Anti-enumeration: always generic, issue OTP only if account exists
  let mailSent = false;
  if (user) {
    try {
      const r = await issueResetOtp(user.email, user.role);
      mailSent = r.mailSent;
    } catch (e) {
      if (e.status !== 429) throw e;
    }
  }
  audit('password_reset_otp', 'auth', `Password reset OTP requested — ${email}`, user?._id || null, req);
  res.json({ success: true, data: { message: 'If an account exists for this email, a reset code has been sent.', mailSent } });
});

const verifyResetOtp = asyncHandler(async (req, res) => {
  const { email, role, code } = req.body;
  await checkResetOtp(user_email(email), role || 'student', code);
  function user_email(e) { return e; }
  const token = require('crypto').randomBytes(32).toString('hex');
  resetTokens.set(token, { email: String(email).toLowerCase(), role: role || 'student', exp: Date.now() + RESET_TTL_MS });
  res.json({ success: true, data: { resetToken: token } });
});

const resetPassword = asyncHandler(async (req, res) => {
  const { email, role, resetToken, password, confirm } = req.body;
  const rec = resetTokens.get(resetToken);
  if (!rec || rec.exp < Date.now() || rec.email !== String(email || '').toLowerCase()) throw ApiError.badRequest('Invalid or expired reset session.');
  if (password !== confirm) throw ApiError.badRequest('Passwords do not match.');
  const weak = passwordStrengthError(password);
  if (weak) throw ApiError.badRequest(weak);
  const user = await User.findOne({ email: rec.email, role: rec.role }).select('+password');
  if (!user) throw ApiError.badRequest('Account not found.');
  user.password = await hashPassword(password);
  user.tokenVersion += 1; // revoke sessions
  if (!user.emailVerifiedAt) { user.emailVerifiedAt = new Date(); user.status = 'active'; }
  await user.save();
  if (!(await verifyPassword(password, (await User.findById(user._id).select('+password')).password))) {
    throw ApiError.badRequest('Password update verification failed.');
  }
  resetTokens.delete(resetToken);
  audit('password_reset', 'auth', `Password reset via email OTP (${rec.role}) — ${rec.email}`, user._id, req);
  res.json({ success: true, data: { message: 'Password reset successful. Please sign in.' } });
});

const changePassword = asyncHandler(async (req, res) => {
  const { currentPassword, password, confirm } = req.body;
  const user = await User.findById(req.user._id).select('+password');
  if (!(await verifyPassword(currentPassword, user.password))) throw ApiError.badRequest('Current password is incorrect.');
  if (password !== confirm) throw ApiError.badRequest('Passwords do not match.');
  const weak = passwordStrengthError(password);
  if (weak) throw ApiError.badRequest(weak);
  user.password = await hashPassword(password);
  user.tokenVersion += 1; await user.save();
  setRefresh(res, user);
  res.json({ success: true, data: { message: 'Password changed.', accessToken: signAccess(user) } });
});

/* ---- Google OAuth (parity with legacy auth/google-login.php, which shipped as a
   configuration-gated stub). Fully implemented but only runs when the three
   GOOGLE_* env vars are set; otherwise it answers 503 with setup guidance. ---- */
const GOOGLE_AUTH = 'https://accounts.google.com/o/oauth2/v2/auth';
const GOOGLE_TOKEN = 'https://oauth2.googleapis.com/token';
const GOOGLE_USERINFO = 'https://openidconnect.googleapis.com/v1/userinfo';

function googleConfigured() {
  return !!(env.GOOGLE_CLIENT_ID && env.GOOGLE_CLIENT_SECRET && env.GOOGLE_REDIRECT_URI);
}

const googleStart = asyncHandler(async (req, res) => {
  if (!googleConfigured()) throw new ApiError(503, 'Google sign-in is not configured on this server. Set GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET and GOOGLE_REDIRECT_URI.');
  const params = new URLSearchParams({
    client_id: env.GOOGLE_CLIENT_ID,
    redirect_uri: env.GOOGLE_REDIRECT_URI,
    response_type: 'code',
    scope: 'openid email profile',
    access_type: 'online',
    prompt: 'select_account',
  });
  res.redirect(`${GOOGLE_AUTH}?${params.toString()}`);
});

const googleCallback = asyncHandler(async (req, res) => {
  const client = env.CLIENT_URL[0];
  if (!googleConfigured()) return res.redirect(`${client}/login?google=unconfigured`);
  const { code, error } = req.query;
  if (error || !code) return res.redirect(`${client}/login?google=denied`);
  let email = ''; let name = '';
  try {
    const tokRes = await fetch(GOOGLE_TOKEN, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({ code, client_id: env.GOOGLE_CLIENT_ID, client_secret: env.GOOGLE_CLIENT_SECRET, redirect_uri: env.GOOGLE_REDIRECT_URI, grant_type: 'authorization_code' }),
    });
    if (!tokRes.ok) return res.redirect(`${client}/login?google=failed`);
    const { access_token } = await tokRes.json();
    const uiRes = await fetch(GOOGLE_USERINFO, { headers: { Authorization: `Bearer ${access_token}` } });
    if (!uiRes.ok) return res.redirect(`${client}/login?google=failed`);
    const info = await uiRes.json();
    email = String(info.email || '').toLowerCase();
    name = String(info.name || '').slice(0, 120);
  } catch { return res.redirect(`${client}/login?google=failed`); }
  if (!email) return res.redirect(`${client}/login?google=failed`);

  const user = await User.findOne({ email });
  if (!user) return res.redirect(`${client}/register?google=1&email=${encodeURIComponent(email)}&name=${encodeURIComponent(name)}`);
  if (user.status !== 'active') return res.redirect(`${client}/login?google=inactive`);
  // Atomically flip firstLogin so a first Google sign-in is celebrated once.
  const flip = await User.updateOne({ _id: user._id, firstLogin: true }, { $set: { firstLogin: false } });
  const isFirstLogin = flip.modifiedCount === 1;
  user.emailVerifiedAt = user.emailVerifiedAt || new Date();
  user.lastLogin = new Date(); await user.save();
  setRefresh(res, user);
  audit('login', 'auth', `Login via Google (${user.role}) — ${user.name}${isFirstLogin ? ' (first login)' : ''}`, user._id, req);
  res.redirect(`${client}/oauth/callback${isFirstLogin ? '?firstLogin=1' : ''}`);
});

module.exports = { register, login, logout, refresh, me, verifyEmail, resendOtp, forgotPassword, verifyResetOtp, resetPassword, changePassword, googleStart, googleCallback };
