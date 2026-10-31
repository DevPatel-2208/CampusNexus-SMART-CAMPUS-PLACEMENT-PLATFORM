const env = require('../config/env');

const allowedOrigins = new Set(env.CORS_ORIGINS);

module.exports = {
  origin(origin, callback) {
    // Requests without an Origin header are server-to-server or same-origin;
    // CORS does not grant them browser access to another origin.
    if (!origin) return callback(null, true);
    if (allowedOrigins.has(origin)) return callback(null, true);

    // Vite can choose another port when 5173 is occupied. Keep this flexibility
    // limited to local HTTP development origins and never enable it in production.
    if (env.NODE_ENV !== 'production' && /^http:\/\/(localhost|127\.0\.0\.1):\d+$/.test(origin)) {
      return callback(null, true);
    }
    return callback(null, false);
  },
  credentials: true,
  methods: ['GET', 'HEAD', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Authorization', 'Content-Type', 'X-Requested-With'],
  optionsSuccessStatus: 204,
  maxAge: 86400,
};
