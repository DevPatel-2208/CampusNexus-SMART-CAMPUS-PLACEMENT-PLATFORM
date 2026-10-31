const env = require('./config/env');
const connectDB = require('./config/db');
const logger = require('./utils/logger');
const app = require('./app');

let server;

// AI provider settings are loaded from the backend environment at startup.
connectDB().then(() => {
  logger.info('MongoDB connected');
  server = app.listen(env.PORT, () => {
    logger.info('CampusNexus API listening', { port: env.PORT, env: env.NODE_ENV });
  });

  server.on('error', (err) => {
    if (err.code === 'EADDRINUSE') {
      logger.error(`Port ${env.PORT} is already in use. Stop the other server using this port, or set PORT to an unused port in backend/.env.`, {
        port: env.PORT,
        code: err.code,
      });
    } else {
      logger.error('CampusNexus API failed to start', { message: err.message, code: err.code });
    }
    process.exit(1);
  });
}).catch((err) => {
  const atlasIpHint = /not authorized|whitelist|ip address/i.test(err.message)
    ? 'Add the Render service outbound IP to MongoDB Atlas Network Access, then restart the Render service.'
    : undefined;
  logger.error('MongoDB connection failed', { message: err.message, action: atlasIpHint });
  process.exit(1);
});

// Process-level unhandled exception & rejection guards
process.on('unhandledRejection', (reason) => {
  logger.error('Unhandled Promise Rejection', { reason: reason?.message || reason });
});

process.on('uncaughtException', (err) => {
  logger.error('Uncaught Exception', { message: err.message, stack: err.stack });
  process.exit(1);
});

// Graceful shutdown on termination signals (Render / Docker)
const handleShutdown = (signal) => {
  logger.info(`Received ${signal}. Shutting down gracefully...`);
  if (server) {
    server.close(() => {
      logger.info('HTTP server closed.');
      process.exit(0);
    });
  } else {
    process.exit(0);
  }
};

process.on('SIGTERM', () => handleShutdown('SIGTERM'));
process.on('SIGINT', () => handleShutdown('SIGINT'));
