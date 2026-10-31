const { AuditLog } = require('../models/Misc');

function audit(action, module, description, userId = null, req = null) {
  AuditLog.create({
    user: userId || (req && req.user ? req.user._id : null),
    action, module, description,
    ipAddress: req ? (req.headers['x-forwarded-for'] || req.ip || '').toString().split(',')[0].trim() : null,
  }).catch(() => {});
}

module.exports = audit;
