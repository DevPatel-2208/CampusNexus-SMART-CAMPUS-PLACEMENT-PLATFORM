const { Notification, Announcement, Contact, AuditLog } = require('../models/Misc');
const User = require('../models/User');
const { ApiError, asyncHandler, paginate, escapeRegex } = require('../utils/helpers');
const { notifyUser } = require('../services/notify.service');
const audit = require('../services/audit.service');

const listNotif = asyncHandler(async (req, res) => {
  const { page, limit, skip } = paginate(req.query);
  const filter = { user: req.user._id };
  if (req.query.unread === '1') filter.isRead = false;
  if (req.query.type && req.query.type !== 'all') filter.type = req.query.type;
  const q = (req.query.q || '').toString().trim();
  if (q) {
    const rx = new RegExp(require('../utils/helpers').escapeRegex(q), 'i');
    filter.$or = [{ title: rx }, { message: rx }];
  }
  const [items, total, unread, byType] = await Promise.all([
    Notification.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit),
    Notification.countDocuments(filter),
    Notification.countDocuments({ user: req.user._id, isRead: false }),
    Notification.aggregate([{ $match: { user: req.user._id } }, { $group: { _id: '$type', n: { $sum: 1 }, unread: { $sum: { $cond: ['$isRead', 0, 1] } } } }]),
  ]);
  res.json({ success: true, data: items, unread, types: byType, pagination: { page, limit, total, pages: Math.max(1, Math.ceil(total / limit)) } });
});
const unreadCount = asyncHandler(async (req, res) => {
  res.json({ success: true, data: { unread: await Notification.countDocuments({ user: req.user._id, isRead: false }) } });
});
const markRead = asyncHandler(async (req, res) => {
  const n = await Notification.findOne({ _id: req.params.id, user: req.user._id });
  if (!n) throw ApiError.notFound('Notification not found');
  n.isRead = true; await n.save();
  res.json({ success: true, data: n });
});
const markAll = asyncHandler(async (req, res) => {
  await Notification.updateMany({ user: req.user._id, isRead: false }, { isRead: true });
  res.json({ success: true, data: { message: 'All marked as read' } });
});
const deleteNotif = asyncHandler(async (req, res) => {
  const n = await Notification.findOneAndDelete({ _id: req.params.id, user: req.user._id });
  if (!n) throw ApiError.notFound('Notification not found');
  res.json({ success: true, data: { message: 'Deleted' } });
});

const listAnn = asyncHandler(async (req, res) => {
  const items = await Announcement.find({}).populate('createdBy', 'name').sort({ createdAt: -1 }).limit(100);
  res.json({ success: true, data: items });
});
const activeAnn = asyncHandler(async (req, res) => {
  const today = new Date(new Date().toDateString());
  const filter = { status: 'active', publishDate: { $lte: today }, $and: [{ $or: [{ expiryDate: null }, { expiryDate: { $gte: today } }] }] };
  let items = await Announcement.find(filter).sort({ createdAt: -1 });
  if (req.user) items = items.filter((a) => a.targetRole === 'all' || a.targetRole === req.user.role);
  res.json({ success: true, data: items });
});
const createAnn = asyncHandler(async (req, res) => {
  const a = await Announcement.create({ ...req.body, createdBy: req.user._id, status: req.body.status || 'draft' });
  res.status(201).json({ success: true, data: a });
});
const patchAnn = asyncHandler(async (req, res) => {
  const a = await Announcement.findById(req.params.id);
  if (!a) throw ApiError.notFound('Announcement not found');
  Object.assign(a, req.body); await a.save();
  res.json({ success: true, data: a });
});
const deleteAnn = asyncHandler(async (req, res) => {
  await Announcement.findByIdAndDelete(req.params.id);
  res.json({ success: true, data: { message: 'Deleted' } });
});
const publishAnn = asyncHandler(async (req, res) => {
  const a = await Announcement.findById(req.params.id);
  if (!a) throw ApiError.notFound('Announcement not found');
  if (a.publishedAt) return res.json({ success: true, data: a }); // idempotent fanout
  a.status = 'active'; a.publishedAt = new Date(); await a.save();
  const match = { status: 'active' };
  if (a.targetRole !== 'all') match.role = a.targetRole;
  const users = await User.find(match).select('_id');
  for (const u of users) await notifyUser(u._id, a.title, a.message, { type: 'announcement', referenceId: a._id, dedupe: true });
  audit('announce', 'announcements', `Announcement published: ${a.title}`, req.user._id, req);
  res.json({ success: true, data: a });
});

const postContact = asyncHandler(async (req, res) => {
  const c = await Contact.create(req.body);
  res.status(201).json({ success: true, data: { message: 'Message received. We will get back to you.', id: c._id } });
});
const listContact = asyncHandler(async (req, res) => {
  const { page, limit, skip } = paginate(req.query);
  const filter = {};
  if (req.query.status) filter.status = req.query.status;
  const [items, total] = await Promise.all([Contact.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit), Contact.countDocuments(filter)]);
  res.json({ success: true, data: items, pagination: { page, limit, total, pages: Math.max(1, Math.ceil(total / limit)) } });
});
const patchContact = asyncHandler(async (req, res) => {
  const c = await Contact.findById(req.params.id);
  if (!c) throw ApiError.notFound('Message not found');
  if (!['New', 'Read', 'Resolved'].includes(req.body.status)) throw ApiError.badRequest('Invalid status.');
  c.status = req.body.status; await c.save();
  audit('contact_triage', 'contact', `Contact ${c._id} → ${c.status}`, req.user._id, req);
  res.json({ success: true, data: c });
});

const listAudit = asyncHandler(async (req, res) => {
  const { page, limit, skip } = paginate(req.query);
  const filter = {};
  if (req.query.module) filter.module = req.query.module;
  if (req.query.action) filter.action = req.query.action;
  const { from, to, search } = req.query;
  if (from || to) {
    filter.createdAt = {};
    if (from) filter.createdAt.$gte = new Date(from);
    if (to) { const d = new Date(to); d.setHours(23, 59, 59, 999); filter.createdAt.$lte = d; }
  }
  if (search) {
    const rx = new RegExp(escapeRegex(search), 'i');
    filter.$or = [{ description: rx }, { action: rx }, { module: rx }];
  }
  const [items, total] = await Promise.all([
    AuditLog.find(filter).populate('user', 'name role').sort({ createdAt: -1 }).skip(skip).limit(limit),
    AuditLog.countDocuments(filter),
  ]);
  res.json({ success: true, data: items, pagination: { page, limit, total, pages: Math.max(1, Math.ceil(total / limit)) } });
});

const aiChat = asyncHandler(async (req, res) => {
  const message = String(req.body.message || '').slice(0, 1000);
  if (!message.trim()) throw ApiError.badRequest('Message is required.');
  const now = Date.now();
  req.session_ai_last = req.session_ai_last || 0;
  const { GROQ_API_KEY, GROQ_MODEL } = require('../config/env');
  if (GROQ_API_KEY) {
    try {
      const r = await fetch('https://api.groq.com/openai/v1/chat/completions', {
        method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + GROQ_API_KEY },
        body: JSON.stringify({ model: GROQ_MODEL, temperature: 0.6, max_tokens: 650, messages: [{ role: 'system', content: 'You are CampusNexus placement assistant. Be concise and practical.' }, { role: 'user', content: message }] }),
      });
      if (r.ok) {
        const data = await r.json();
        return res.json({ success: true, data: { reply: data.choices?.[0]?.message?.content || 'No response.', live: true } });
      }
    } catch { /* fall through to offline */ }
  }
  const m = message.toLowerCase();
  let reply = 'I can help with jobs, resume tips, interview prep, and placement status. Ask me about open roles or your applications.';
  if (/job|vacancy|opening|hiring/.test(m)) reply = 'Browse Jobs → check the eligibility badge → Apply. Keep CGPA, backlogs and deadline in mind; each job shows its requirements.';
  else if (/resume|ats|cv/.test(m)) reply = 'Upload a PDF resume (max 5MB) on the Resume page. The ATS score rewards: resume 25, skills 20, projects 15, education 15, certifications 10.';
  else if (/interview/.test(m)) reply = 'Interviews appear under Interviews with date, mode, and join link. Technical rounds test your stack; HR rounds cover fit and joining timeline.';
  else if (/assessment|exam|test|mcq/.test(m)) reply = 'Assessments unlock after you apply for the linked job. One active attempt at a time; 3 integrity violations auto-submit.';
  else if (/offer|placement|select/.test(m)) reply = 'Offers appear under Offers. Accepting creates your placement record and marks you placed. Watch the expiry date.';
  res.json({ success: true, data: { reply: reply + (GROQ_API_KEY ? '' : ' _Note: live AI is unreachable; offline guidance shown._'), live: false } });
});

const health = asyncHandler(async (req, res) => {
  const mongoose = require('mongoose');
  res.json({ success: true, data: { status: 'ok', db: mongoose.connection.readyState === 1 ? 'connected' : 'disconnected', time: new Date().toISOString() } });
});

module.exports = { listNotif, unreadCount, markRead, markAll, deleteNotif, listAnn, activeAnn, createAnn, patchAnn, deleteAnn, publishAnn, postContact, listContact, patchContact, listAudit, aiChat, health };
