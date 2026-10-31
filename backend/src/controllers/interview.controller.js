const { Interview } = require('../models/Drive');
const { Application } = require('../models/Application');
const User = require('../models/User');
const CompanyProfile = require('../models/CompanyProfile');
const { ApiError, asyncHandler, paginate, omit, PROTECTED_FIELDS, escapeRegex } = require('../utils/helpers');
const { notifyUser } = require('../services/notify.service');
const { recordStatus } = require('../services/application.service');

async function ownCompany(userId) {
  const cp = await CompanyProfile.findOne({ user: userId });
  if (!cp) throw ApiError.badRequest('Company profile not found.');
  return cp;
}

const mine = asyncHandler(async (req, res) => {
  const filter = { student: req.user._id };
  if (req.query.upcoming === '1') { filter.status = 'scheduled'; filter.interviewDate = { $gte: new Date(new Date().toDateString()) }; }
  const items = await Interview.find(filter).populate('company', 'companyName').populate({ path: 'application', populate: { path: 'job', select: 'title' } }).sort({ interviewDate: 1 });
  res.json({ success: true, data: items });
});

const companyList = asyncHandler(async (req, res) => {
  const cp = await ownCompany(req.user._id);
  const items = await Interview.find({ company: cp._id }).populate('student', 'name email').populate({ path: 'application', populate: { path: 'job', select: 'title' } }).sort({ interviewDate: -1 });
  res.json({ success: true, data: items });
});

const all = asyncHandler(async (req, res) => {
  const { page, limit, skip } = paginate(req.query);
  const filter = {};
  for (const k of ['mode', 'result', 'status']) if (req.query[k]) filter[k] = req.query[k];
  if (req.query.search) {
    const rx = new RegExp(escapeRegex(req.query.search), 'i');
    const [studs, comps] = await Promise.all([
      User.find({ role: 'student', $or: [{ name: rx }, { email: rx }] }).select('_id'),
      CompanyProfile.find({ companyName: rx }).select('_id'),
    ]);
    filter.$or = [{ student: { $in: studs.map((s) => s._id) } }, { company: { $in: comps.map((c) => c._id) } }, { roundName: rx }];
  }
  const [items, total] = await Promise.all([
    Interview.find(filter).populate('student', 'name email').populate('company', 'companyName').sort({ interviewDate: -1 }).skip(skip).limit(limit),
    Interview.countDocuments(filter),
  ]);
  res.json({ success: true, data: items, pagination: { page, limit, total, pages: Math.max(1, Math.ceil(total / limit)) } });
});

const getOne = asyncHandler(async (req, res) => {
  const iv = await Interview.findById(req.params.id)
    .populate('company', 'companyName')
    .populate('student', 'name email')
    .populate({ path: 'application', populate: { path: 'job', select: 'title location jobType workMode' } });
  if (!iv) throw ApiError.notFound('Interview not found');
  const uid = String(req.user._id);
  if (req.user.role === 'student' && String(iv.student?._id || iv.student) !== uid) throw ApiError.forbidden('Access denied');
  if (req.user.role === 'company') {
    const cp = await ownCompany(req.user._id);
    if (String(iv.company?._id || iv.company) !== String(cp._id)) throw ApiError.forbidden('Access denied');
  }
  res.json({ success: true, data: iv });
});

const schedule = asyncHandler(async (req, res) => {
  const cp = await ownCompany(req.user._id);
  const { applicationId, roundName, interviewDate, interviewTime, mode, meetingLink, location, interviewer, notes } = req.body;
  const app = await Application.findById(applicationId).populate('job');
  if (!app) throw ApiError.notFound('Application not found');
  if (String(app.job.company) !== String(cp._id)) throw ApiError.forbidden('Access denied');
  const dt = new Date(interviewDate);
  if (isNaN(dt) || dt < new Date(new Date().toDateString())) throw ApiError.badRequest('Interview date cannot be in the past.');
  if (mode === 'Online' && !meetingLink) throw ApiError.badRequest('Online interviews require a meeting link.');
  if (mode === 'Offline' && !location) throw ApiError.badRequest('Offline interviews require a location.');
  const iv = await Interview.create({ application: app._id, company: cp._id, student: app.student, roundName, interviewDate: dt, interviewTime, mode, meetingLink: meetingLink || null, location: location || null, interviewer: interviewer || null, notes: notes || null });
  recordStatus(app, 'Interview', `${roundName} scheduled`, cp.user); await app.save();
  await notifyUser(app.student, 'Interview scheduled', `${cp.companyName} interview on ${interviewDate} at ${interviewTime} (${mode}).`, { type: 'interview', referenceId: iv._id, priority: 'high', actionUrl: '/student/interviews' });
  res.status(201).json({ success: true, data: iv });
});

const patch = asyncHandler(async (req, res) => {
  const iv = await Interview.findById(req.params.id);
  if (!iv) throw ApiError.notFound('Interview not found');
  if (req.user.role === 'company') {
    const cp = await ownCompany(req.user._id);
    if (String(iv.company) !== String(cp._id)) throw ApiError.forbidden('Access denied');
  }
  Object.assign(iv, omit(req.body, [...PROTECTED_FIELDS, 'application'])); await iv.save();
  res.json({ success: true, data: iv });
});

const remove = asyncHandler(async (req, res) => {
  const iv = await Interview.findById(req.params.id);
  if (!iv) throw ApiError.notFound('Interview not found');
  if (req.user.role === 'company') {
    const cp = await ownCompany(req.user._id);
    if (String(iv.company) !== String(cp._id)) throw ApiError.forbidden('Access denied');
  }
  await iv.deleteOne();
  res.json({ success: true, data: { message: 'Interview deleted' } });
});

module.exports = { mine, companyList, all, getOne, schedule, patch, remove };
