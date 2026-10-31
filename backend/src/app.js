const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const cookieParser = require('cookie-parser');
const rateLimit = require('express-rate-limit');
const mongoSanitize = require('express-mongo-sanitize');
const env = require('./config/env');
const corsOptions = require('./middleware/cors');
const { notFound, errorHandler } = require('./middleware/validate');

const app = express();
app.set('trust proxy', 1);
// Install CORS before other middleware and routes so preflight requests and
// application error responses retain browser access control headers.
app.use(cors(corsOptions));
app.options('*', cors(corsOptions));

app.use(helmet({
  crossOriginResourcePolicy: false,
  crossOriginEmbedderPolicy: false,
}));

app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true, limit: '1mb' }));
app.use(cookieParser());
app.use(mongoSanitize());
app.use(morgan(env.NODE_ENV === 'production' ? 'combined' : 'dev'));

// Rate limiting: in development, completely skip to avoid 429 during active testing.
// In production, allow up to 1500 requests per 15-minute window for SPA navigation and widgets.
const globalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: env.NODE_ENV === 'production' ? 1500 : 100000,
  standardHeaders: true,
  legacyHeaders: false,
  skip: () => env.NODE_ENV !== 'production',
  message: {
    success: false,
    message: 'Too many requests. Please try again after 15 minutes.',
  },
});
app.use(globalLimiter);

// Serve static uploads
app.use('/uploads', express.static('uploads'));

// Health check endpoints for Render and uptime monitoring
app.get('/health', (req, res) => {
  const mailProvider = env.BREVO_API_KEY
    ? 'brevo'
    : env.RESEND_API_KEY
    ? 'resend'
    : (env.SMTP_USER && env.SMTP_PASS ? 'smtp' : 'none');

  res.status(200).json({
    status: 'ok',
    uptime: Math.floor(process.uptime()),
    timestamp: new Date().toISOString(),
    service: 'CampusNexus Backend API',
    mailConfigured: mailProvider !== 'none',
    mailProvider,
  });
});

app.get('/api/v1/health', (req, res) => {
  const mailProvider = env.BREVO_API_KEY
    ? 'brevo'
    : env.RESEND_API_KEY
    ? 'resend'
    : (env.SMTP_USER && env.SMTP_PASS ? 'smtp' : 'none');

  res.status(200).json({
    status: 'ok',
    uptime: Math.floor(process.uptime()),
    timestamp: new Date().toISOString(),
    service: 'CampusNexus Backend API',
    mailConfigured: mailProvider !== 'none',
    mailProvider,
  });
});

app.get('/api/v1/health/mail-check', (req, res) => {
  const brevoKeyPrefix = env.BREVO_API_KEY ? env.BREVO_API_KEY.slice(0, 8) : null;
  const brevoKeyValid = Boolean(env.BREVO_API_KEY && env.BREVO_API_KEY.startsWith('xkeysib-'));
  const brevoIsSmtpPassword = Boolean(env.BREVO_API_KEY && env.BREVO_API_KEY.startsWith('xsmtpsib-'));

  res.status(200).json({
    hasBrevo: Boolean(env.BREVO_API_KEY),
    brevoKeyPrefix,
    brevoKeyStatus: brevoKeyValid
      ? 'VALID_API_KEY_FORMAT'
      : brevoIsSmtpPassword
      ? 'WRONG_KEY_TYPE: You pasted an SMTP password (starts with xsmtpsib-). You need an API Key (starts with xkeysib-) from https://app.brevo.com/settings/keys/api'
      : env.BREVO_API_KEY
      ? 'UNKNOWN_KEY_FORMAT'
      : 'NOT_SET',
    hasResend: Boolean(env.RESEND_API_KEY),
    hasSmtp: Boolean(env.SMTP_USER && env.SMTP_PASS),
    activeProvider: brevoKeyValid
      ? 'brevo (HTTPS:443 - ACTIVE)'
      : env.RESEND_API_KEY
      ? 'resend (HTTPS:443)'
      : 'none',
    instruction: 'To fix: Go to https://app.brevo.com/settings/keys/api -> Generate a new API key -> Copy the key starting with xkeysib- -> Paste into BREVO_API_KEY in Render.'
  });
});

app.get('/api/v1/health/brevo-senders', async (req, res) => {
  if (!env.BREVO_API_KEY) return res.status(400).json({ error: 'BREVO_API_KEY not configured' });
  try {
    const r = await fetch('https://api.brevo.com/v3/senders', {
      headers: { 'api-key': env.BREVO_API_KEY.trim(), 'Accept': 'application/json' },
    });
    const d = await r.json();
    res.status(r.status).json({ status: r.status, data: d });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.get('/api/v1/health/test-email', async (req, res) => {
  const { sendMail, emailVerificationTemplate } = require('./services/mail.service');
  const to = req.query.to || env.SMTP_USER || 'devkpatel426@gmail.com';
  try {
    const result = await sendMail(to, 'CampusNexus Live Test OTP: 123456', emailVerificationTemplate('123456', 10));
    res.json({ success: true, to, result });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// API Routes
app.use('/api/v1/auth', require('./routes/auth.routes'));
app.use('/api/v1/jobs', require('./routes/job.routes'));
app.use('/api/v1/students', require('./routes/student.routes'));
app.use('/api/v1/student/chat', require('./routes/chatbot.routes'));
app.use('/api/v1/company', require('./routes/company.routes'));
app.use('/api/v1/tpo', require('./routes/tpo.routes'));
app.use('/api/v1/contact', require('./routes/contact.routes'));
app.use('/api/v1', require('./routes/api.routes'));

app.get('/', (req, res) => res.json({ success: true, data: { name: 'CampusNexus API', version: '1.0.0', status: 'live' } }));

app.use(notFound);
app.use(errorHandler);

module.exports = app;
