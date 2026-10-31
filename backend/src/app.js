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
  res.status(200).json({
    status: 'ok',
    uptime: Math.floor(process.uptime()),
    timestamp: new Date().toISOString(),
    service: 'CampusNexus Backend API',
    mailConfigured: Boolean(env.SMTP_USER && env.SMTP_PASS),
  });
});

app.get('/api/v1/health', (req, res) => {
  res.status(200).json({
    status: 'ok',
    uptime: Math.floor(process.uptime()),
    timestamp: new Date().toISOString(),
    service: 'CampusNexus Backend API',
    mailConfigured: Boolean(env.SMTP_USER && env.SMTP_PASS),
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
