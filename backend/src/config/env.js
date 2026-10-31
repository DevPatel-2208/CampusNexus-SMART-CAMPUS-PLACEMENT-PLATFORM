const path = require('path');

// Always load the backend's own env file, even when the server is started
// from the repository root (for example, `node backend/src/server.js`).
require('dotenv').config({ path: path.resolve(__dirname, '../../.env') });

function required(name, fallback) {
  const v = process.env[name] ?? fallback;
  if ((v === undefined || v === '') && process.env.NODE_ENV === 'production') {
    throw new Error(`Missing required env var ${name}`);
  }
  return v;
}

const env = {
  NODE_ENV: process.env.NODE_ENV || 'development',
  PORT: parseInt(process.env.PORT || '5002', 10),
  MONGO_URI: process.env.MONGO_URI || process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/careerconnect',
  CORS_ORIGINS: (process.env.CORS_ORIGIN || process.env.CLIENT_URL || 'http://localhost:5173,https://campusnexus-placement-platform.netlify.app')
    .split(',')
    .map((s) => s.trim().replace(/\/+$/, ''))
    .filter(Boolean),
  JWT_ACCESS_SECRET: required('JWT_ACCESS_SECRET', 'dev-access-secret-change-me-0123456789'),
  JWT_REFRESH_SECRET: required('JWT_REFRESH_SECRET', 'dev-refresh-secret-change-me-0123456789'),
  JWT_ACCESS_EXPIRES: process.env.JWT_ACCESS_EXPIRES || '15m',
  JWT_REFRESH_EXPIRES: process.env.JWT_REFRESH_EXPIRES || '7d',
  SMTP_HOST: process.env.SMTP_HOST || '',
  SMTP_PORT: parseInt(process.env.SMTP_PORT || '587', 10),
  SMTP_SECURE: process.env.SMTP_SECURE === 'true',
  SMTP_USER: process.env.SMTP_USER || '',
  SMTP_PASS: process.env.SMTP_PASS || '',
  MAIL_FROM: process.env.MAIL_FROM || 'CampusNexus <no-reply@campusnexus.local>',
  MAIL_REQUIRED: process.env.MAIL_REQUIRED === 'true',
  GROQ_API_KEY: process.env.GROQ_API_KEY || '',
  GROQ_MODEL: process.env.GROQ_MODEL || 'qwen/qwen3.8-27b',
  // Generic OpenAI-compatible AI provider (optional). When AI_API_KEY + AI_BASE_URL
  // are set they take precedence over Groq for AI question generation.
  AI_PROVIDER: process.env.AI_PROVIDER || '',
  AI_BASE_URL: process.env.AI_BASE_URL || '',
  AI_API_KEY: process.env.AI_API_KEY || '',
  AI_MODEL: process.env.AI_MODEL || '',
  GOOGLE_CLIENT_ID: process.env.GOOGLE_CLIENT_ID || '',
  GOOGLE_CLIENT_SECRET: process.env.GOOGLE_CLIENT_SECRET || '',
  GOOGLE_REDIRECT_URI: process.env.GOOGLE_REDIRECT_URI || '',
  ALLOW_SEED: process.env.ALLOW_SEED === 'true',
  RESEND_API_KEY: (process.env.RESEND_API_KEY || '').trim(),
  RESEND_FROM: (process.env.RESEND_FROM || '').trim(),
  BREVO_API_KEY: (process.env.BREVO_API_KEY || '').trim(),
  BREVO_SENDER: (process.env.BREVO_SENDER || process.env.SMTP_USER || '').trim(),
};

if (env.NODE_ENV === 'production') {
  if (env.JWT_ACCESS_SECRET.length < 32 || env.JWT_REFRESH_SECRET.length < 32) {
    throw new Error('JWT secrets must be at least 32 characters in production');
  }
  const mailConfigured = Boolean(
    (env.BREVO_API_KEY && env.BREVO_SENDER) ||
    env.RESEND_API_KEY ||
    (env.SMTP_HOST && env.SMTP_USER && env.SMTP_PASS)
  );
  if (env.MAIL_REQUIRED && !mailConfigured) {
    throw new Error('MAIL_REQUIRED=true but no complete mail provider configuration is set');
  }
}

module.exports = env;
