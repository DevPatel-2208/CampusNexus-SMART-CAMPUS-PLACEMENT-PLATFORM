const { validationResult } = require('express-validator');
const { ApiError } = require('../utils/helpers');
const logger = require('../utils/logger');

function validate(req, res, next) {
  const result = validationResult(req);
  if (result.isEmpty()) return next();
  const errors = result.array().map((e) => ({ field: e.path, message: e.msg }));
  return next(ApiError.badRequest('Validation failed', errors));
}

function notFound(req, res, next) { next(ApiError.notFound(`Route not found: ${req.method} ${req.originalUrl}`)); }

// eslint-disable-next-line no-unused-vars
function errorHandler(err, req, res, next) {
  const status = err.status || 500;
  const body = { success: false, message: err.message || 'Internal server error' };
  if (err.errors) body.errors = err.errors;
  if (err.code) body.code = err.code;
  if (err.resendAfter) body.resendAfter = err.resendAfter;
  if (process.env.NODE_ENV !== 'production' && status === 500) body.stack = err.stack;
  if (status >= 500) logger.error(err, { status, method: req.method, url: req.originalUrl });
  res.status(status).json(body);
}

module.exports = { validate, notFound, errorHandler };
