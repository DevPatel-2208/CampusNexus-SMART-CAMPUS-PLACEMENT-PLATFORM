class ApiError extends Error {
  constructor(status, message, errors) {
    super(message);
    this.status = status;
    this.errors = errors;
  }
  static badRequest(msg = 'Bad request', errors) { return new ApiError(400, msg, errors); }
  static unauthorized(msg = 'Unauthorized') { return new ApiError(401, msg); }
  static forbidden(msg = 'Forbidden') { return new ApiError(403, msg); }
  static notFound(msg = 'Not found') { return new ApiError(404, msg); }
  static conflict(msg = 'Conflict') { return new ApiError(409, msg); }
  static gone(msg = 'Gone') { return new ApiError(410, msg); }
  static locked(msg = 'Too many attempts') { return new ApiError(429, msg); }
}

const asyncHandler = (fn) => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);

function paginate(query = {}, { page: defPage = 1, limit: defLimit = 12 } = {}) {
  const page = Math.max(1, parseInt(query.page, 10) || defPage || 1);
  const limit = Math.min(100, Math.max(1, parseInt(query.limit, 10) || defLimit || 12));
  return { skip: (page - 1) * limit, limit, page };
}

async function pagedResponse(modelQuery, countQuery, page, limit) {
  const [items, total] = await Promise.all([modelQuery, countQuery]);
  return { items, pagination: { page, limit, total, pages: Math.max(1, Math.ceil(total / limit)) } };
}

function escapeRegex(s = '') { return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'); }

/** Return a shallow copy of obj containing only the given keys. */
function pick(obj = {}, keys = []) {
  const out = {};
  for (const k of keys) if (Object.prototype.hasOwnProperty.call(obj, k)) out[k] = obj[k];
  return out;
}

/** Return a shallow copy of obj excluding the given keys (mass-assignment guard). */
function omit(obj = {}, keys = []) {
  const out = { ...obj };
  for (const k of keys) delete out[k];
  return out;
}

const PROTECTED_FIELDS = ['_id', '__v', 'student', 'company', 'user', 'createdAt', 'updatedAt', 'legacyId'];

module.exports = { ApiError, asyncHandler, paginate, pagedResponse, escapeRegex, pick, omit, PROTECTED_FIELDS };
