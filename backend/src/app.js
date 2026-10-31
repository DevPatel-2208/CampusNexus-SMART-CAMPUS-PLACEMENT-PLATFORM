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
  const brevoKeyValid = Boolean(env.BREVO_API_KEY && env.BREVO_API_KEY.startsWith('xkeysib-'));
  const brevoIsSmtpPassword = Boolean(env.BREVO_API_KEY && env.BREVO_API_KEY.startsWith('xsmtpsib-'));
  const fallbackProvider = env.RESEND_API_KEY
    ? 'resend'
    : env.SMTP_USER && env.SMTP_PASS
    ? 'smtp'
    : 'none';

  res.status(200).json({
    hasBrevo: Boolean(env.BREVO_API_KEY),
    brevoKeyStatus: brevoKeyValid
      ? 'FORMAT_OK_AUTH_NOT_VERIFIED'
      : brevoIsSmtpPassword
      ? 'WRONG_KEY_TYPE: You pasted an SMTP password (starts with xsmtpsib-). You need an API Key (starts with xkeysib-) from https://app.brevo.com/settings/keys/api'
      : env.BREVO_API_KEY
      ? 'UNKNOWN_KEY_FORMAT'
      : 'NOT_SET',
    brevoSenderConfigured: Boolean(env.BREVO_SENDER),
    hasResend: Boolean(env.RESEND_API_KEY),
    hasSmtp: Boolean(env.SMTP_USER && env.SMTP_PASS),
    activeProvider: brevoKeyValid
      ? 'brevo (configured; credentials and delivery not verified)'
      : fallbackProvider,
    instruction: 'A key prefix check does not authenticate the key or confirm delivery. Set BREVO_SENDER to a sender verified in Brevo, then check Render logs for [mail:brevo:sent] or [mail:brevo:warn].'
  });
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
