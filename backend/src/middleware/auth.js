const jwt = require('jsonwebtoken');
const { ApiError, asyncHandler } = require('../utils/helpers');
const env = require('../config/env');
const User = require('../models/User');

const protect = asyncHandler(async (req, res, next) => {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : null;
  if (!token) throw ApiError.unauthorized('Authentication required');
  let payload;
  try { payload = jwt.verify(token, env.JWT_ACCESS_SECRET); }
  catch { throw ApiError.unauthorized('Session expired. Please sign in again.'); }
  const user = await User.findById(payload.sub).select('-password');
  if (!user) throw ApiError.unauthorized('Account no longer exists');
  if (user.status !== 'active') throw ApiError.forbidden('Your account is currently inactive. Please contact your institution.');
  if ((payload.tv ?? 0) !== (user.tokenVersion || 0)) throw ApiError.unauthorized('Session revoked. Please sign in again.');
  req.user = user;
  next();
});

const optionalAuth = asyncHandler(async (req, res, next) => {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : null;
  if (!token) return next();
  try {
    const payload = jwt.verify(token, env.JWT_ACCESS_SECRET);
    const user = await User.findById(payload.sub).select('-password');
    if (user && user.status === 'active' && ((payload.tv ?? 0) === (user.tokenVersion || 0))) {
      req.user = user;
    }
  } catch {
    // Non-blocking for optional auth
  }
  next();
});

const requireRole = (...roles) => (req, res, next) => {
  if (!req.user || !roles.includes(req.user.role)) {
    return next(ApiError.forbidden('Access denied — insufficient permissions'));
  }
  next();
};

function signAccess(user) {
  return jwt.sign({ sub: String(user._id), role: user.role, tv: user.tokenVersion || 0 }, env.JWT_ACCESS_SECRET, { expiresIn: env.JWT_ACCESS_EXPIRES });
}
function signRefresh(user) {
  return jwt.sign({ sub: String(user._id), tv: user.tokenVersion || 0, rv: user.refreshVersion || 0, typ: 'refresh' }, env.JWT_REFRESH_SECRET, { expiresIn: env.JWT_REFRESH_EXPIRES });
}
function refreshCookieOptions() {
  const isProd = env.NODE_ENV === 'production';
  return {
    httpOnly: true,
    sameSite: isProd ? 'none' : 'lax',
    secure: isProd,
    path: '/api/v1/auth',
    maxAge: 7 * 24 * 3600 * 1000,
  };
}

module.exports = { protect, optionalAuth, requireRole, signAccess, signRefresh, refreshCookieOptions };
