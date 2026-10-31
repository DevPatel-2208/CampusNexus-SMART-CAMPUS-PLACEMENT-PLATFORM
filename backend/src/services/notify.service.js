const { Notification } = require('../models/Misc');
const { sendMail } = require('./mail.service');
const User = require('../models/User');

/** Canonical notification creator (parity with PHP createNotification/notify_user). */
async function notifyUser(userId, title, message, { type = 'general', referenceId = null, actionUrl = null, priority = 'normal', dedupe = false } = {}) {
  if (!userId) return null;
  if (dedupe) {
    const since = new Date(Date.now() - 24 * 3600 * 1000);
    const dup = await Notification.findOne({ user: userId, type, title, createdAt: { $gt: since } });
    if (dup) return dup;
  }
  const n = await Notification.create({ user: userId, title, message, type, referenceId, actionUrl, priority });
  if (['application', 'assessment', 'interview', 'offer', 'placement', 'drive', 'company'].includes(type) || priority === 'high') {
    try {
      const u = await User.findById(userId);
      if (u && u.status === 'active') await sendMail(u.email, title, `<p>${message}</p>`);
    } catch { /* email best-effort */ }
  }
  return n;
}

async function notifyTpos(title, message, opts = {}) {
  const tpos = await User.find({ role: 'tpo', status: 'active' }).select('_id');
  for (const t of tpos) await notifyUser(t._id, title, message, { ...opts, dedupe: true });
}

module.exports = { notifyUser, notifyTpos };
