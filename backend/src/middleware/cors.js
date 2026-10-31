const env = require('../config/env');

// Verified production and development origins always permitted by default
const DEFAULT_ALLOWED = [
  'https://campusnexus-placement-platform.netlify.app',
  'http://localhost:5173',
  'http://localhost:5174',
  'http://localhost:5175',
  'http://localhost:3000',
  'http://localhost:5000',
  'http://localhost:5002',
  'http://127.0.0.1:5173',
  'http://127.0.0.1:5002',
];

function isOriginAllowed(origin) {
  // Requests without an Origin header (mobile apps, Postman, curl, server-to-server) are allowed
  if (!origin) return true;

  const clean = origin.trim().replace(/\/+$/, '');

  // 1. Check verified default origins
  if (DEFAULT_ALLOWED.includes(clean)) return true;

  // 2. Check dynamically loaded env origins from both CORS_ORIGIN and CLIENT_URL
  const customOrigins = [
    ...(process.env.CORS_ORIGIN || '').split(','),
    ...(process.env.CLIENT_URL || '').split(','),
    ...(Array.isArray(env.CORS_ORIGINS) ? env.CORS_ORIGINS : []),
  ]
    .map((s) => s.trim().replace(/\/+$/, ''))
    .filter(Boolean);

  if (customOrigins.includes(clean)) return true;

  // 3. Allow any Netlify branch preview or deployment for campusnexus-placement-platform
  if (/^https:\/\/([a-zA-Z0-9_-]+--)?campusnexus-placement-platform\.netlify\.app$/.test(clean)) {
    return true;
  }

  // 4. In development, allow any local port (e.g. Vite auto-incrementing port)
  if (env.NODE_ENV !== 'production' && /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(clean)) {
    return true;
  }

  return false;
}

const corsOptions = {
  origin(origin, callback) {
    if (isOriginAllowed(origin)) {
      return callback(null, true);
    }
    // Disallowed origin: do not add CORS headers
    return callback(null, false);
  },
  credentials: true,
  methods: ['GET', 'HEAD', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: [
    'Authorization',
    'Content-Type',
    'X-Requested-With',
    'Accept',
    'Origin',
    'Cache-Control',
    'Pragma',
  ],
  exposedHeaders: ['Content-Disposition', 'X-Total-Count'],
  optionsSuccessStatus: 204,
  maxAge: 86400,
};

module.exports = corsOptions;
module.exports.isOriginAllowed = isOriginAllowed;
