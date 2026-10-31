const { Notification } = require('../models/Misc');
const { sendMail, notificationEmailTemplate } = require('./mail.service');
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
    // Email is best-effort and must not hold an API response open. Persist the
    // in-app notification first, then deliver the branded email in the background.
    void Promise.resolve().then(async () => {
      const u = await User.findById(userId).select('email name status');
      if (!u || u.status !== 'active') return;
      const result = await sendMail(u.email, title, notificationEmailTemplate(title, message, {
        actionUrl,
        type,
        recipientName: u.name,
      }));
      if (!result?.sent) console.warn(`[notify:email-not-sent] notification=${n._id}`);
    }).catch((err) => {
      console.error(`[notify:email-error] notification=${n._id}:`, err.message);
    });
  }
  return n;
}

async function notifyTpos(title, message, opts = {}) {
  const tpos = await User.find({ role: 'tpo', status: 'active' }).select('_id');
  for (const t of tpos) await notifyUser(t._id, title, message, { ...opts, dedupe: true });
}

module.exports = { notifyUser, notifyTpos };
