const mongoose = require('mongoose');

const notificationSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  title: { type: String, required: true, maxlength: 180 },
  message: { type: String, required: true },
  type: { type: String, default: 'general' },
  referenceId: { type: mongoose.Schema.Types.Mixed, default: null },
  actionUrl: { type: String, default: null },
  priority: { type: String, enum: ['low', 'normal', 'high'], default: 'normal' },
  isRead: { type: Boolean, default: false },
  legacyId: { type: Number, default: null },
}, { timestamps: true });
notificationSchema.index({ user: 1, isRead: 1, createdAt: -1 });

const announcementSchema = new mongoose.Schema({
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  title: { type: String, required: true, maxlength: 180 },
  message: { type: String, required: true },
  targetRole: { type: String, enum: ['all', 'student', 'company', 'tpo'], default: 'all' },
  targetCourse: { type: String, default: null },
  targetBranch: { type: String, default: null },
  publishDate: { type: Date, required: true },
  expiryDate: { type: Date, default: null },
  status: { type: String, enum: ['active', 'inactive', 'draft'], default: 'active' },
  publishedAt: { type: Date, default: null },
  legacyId: { type: Number, default: null },
}, { timestamps: true });

const contactSchema = new mongoose.Schema({
  name: { type: String, required: true, maxlength: 120 },
  email: { type: String, required: true, maxlength: 160 },
  subject: { type: String, required: true, maxlength: 180 },
  message: { type: String, required: true },
  status: { type: String, enum: ['New', 'Read', 'Resolved'], default: 'New' },
  legacyId: { type: Number, default: null },
}, { timestamps: true });

const ticketSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  category: { type: String, default: 'General' },
  subject: { type: String, required: true, maxlength: 180 },
  message: { type: String, required: true },
  replyMessage: { type: String, default: null },
  status: { type: String, enum: ['Open', 'In Progress', 'Resolved', 'Closed'], default: 'Open' },
  repliedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
  repliedAt: { type: Date, default: null },
}, { timestamps: true });

const auditSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
  action: { type: String, required: true, maxlength: 100 },
  module: { type: String, default: null },
  description: { type: String, default: null },
  ipAddress: { type: String, default: null },
  legacyId: { type: Number, default: null },
}, { timestamps: { createdAt: 'createdAt', updatedAt: false } });
auditSchema.index({ user: 1 });

const emailOtpSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  otpHash: { type: String, required: true },
  expiresAt: { type: Date, required: true },
  attempts: { type: Number, default: 0 },
  lastSentAt: { type: Date, default: Date.now },
  verifiedAt: { type: Date, default: null },
  legacyId: { type: Number, default: null },
}, { timestamps: true });
emailOtpSchema.index({ user: 1, verifiedAt: 1, expiresAt: 1 });

const resetOtpSchema = new mongoose.Schema({
  email: { type: String, required: true, lowercase: true },
  role: { type: String, default: 'student' },
  otpHash: { type: String, required: true },
  expiresAt: { type: Date, required: true },
  attempts: { type: Number, default: 0 },
  lastSentAt: { type: Date, default: Date.now },
  verifiedAt: { type: Date, default: null },
  legacyId: { type: Number, default: null },
}, { timestamps: true });
resetOtpSchema.index({ email: 1, role: 1, verifiedAt: 1, expiresAt: 1 });

const externalCacheSchema = new mongoose.Schema({
  title: String, companyName: String, location: String, salary: String, jobType: String,
  description: String, applyUrl: String, source: String,
  query: { type: String, default: '' },
}, { timestamps: { createdAt: 'fetchedAt', updatedAt: false } });
externalCacheSchema.index({ fetchedAt: 1 }, { expireAfterSeconds: 6 * 3600 });
externalCacheSchema.index({ title: 1 });

module.exports = {
  Notification: mongoose.model('Notification', notificationSchema),
  Announcement: mongoose.model('Announcement', announcementSchema),
  Contact: mongoose.model('Contact', contactSchema),
  SupportTicket: mongoose.model('SupportTicket', ticketSchema),
  AuditLog: mongoose.model('AuditLog', auditSchema),
  EmailOtp: mongoose.model('EmailOtp', emailOtpSchema),
  ResetOtp: mongoose.model('ResetOtp', resetOtpSchema),
  ExternalJobsCache: mongoose.model('ExternalJobsCache', externalCacheSchema),
};
