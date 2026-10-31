const { Application, APP_STATUSES } = require('../models/Application');
const { Job } = require('../models/Job');
const { PlacementDrive } = require('../models/Drive');
const { ApiError, asyncHandler, paginate } = require('../utils/helpers');
const { notifyUser } = require('../services/notify.service');
const { recordStatus } = require('../services/application.service');
const audit = require('../services/audit.service');

const apply = asyncHandler(async (req, res) => {
  const { jobId, driveId, coverLetter } = req.body;
  const job = await Job.findById(jobId).populate('company');
  if (!job) throw ApiError.notFound('Job not found');
  if (job.status !== 'Open' || job.approvalStatus !== 'approved') throw ApiError.badRequest('This job is not open for applications.');
  if (new Date(job.deadline) < new Date(new Date().toDateString())) throw ApiError.badRequest('Application deadline has passed.');
  let drive = null;
  if (driveId) {
    drive = await PlacementDrive.findById(driveId);
    if (!drive) throw ApiError.notFound('Drive not found');
  }
  try {
    const app = await Application.create({ student: req.user._id, job: job._id, drive: drive?._id || null, status: 'Applied', coverLetter: coverLetter || null, history: [{ status: 'Applied', note: 'Application submitted', by: req.user._id, at: new Date() }] });
    await notifyUser(req.user._id, 'Application submitted', `Your application for ${job.title} has been received.`, { type: 'application', referenceId: app._id, actionUrl: '/student/applications' });
    if (job.company?.user) await notifyUser(job.company.user, 'New application received', `A student applied for ${job.title}`, { type: 'application', referenceId: app._id, actionUrl: '/company/applications' });
    audit('application', 'applications', `${req.user.name} applied to ${job.title}`, req.user._id, req);
    res.status(201).json({ success: true, data: app });
  } catch (e) {
    if (e.code === 11000) throw ApiError.conflict('You have already applied for this job.');
    throw e;
  }
});

const myApplications = asyncHandler(async (req, res) => {
  const { page, limit, skip } = paginate(req.query);
  const filter = { student: req.user._id };
  if (req.query.status) filter.status = req.query.status;
  const q = (req.query.q || '').toString().trim();
  if (q) {
    const rx = new RegExp(require('../utils/helpers').escapeRegex(q), 'i');
    const CompanyProfile = require('../models/CompanyProfile');
    const { Job } = require('../models/Job');
    const cos = await CompanyProfile.find({ companyName: rx }).select('_id');
    const jobs = await Job.find({ $or: [{ title: rx }, { company: { $in: cos.map((c) => c._id) } }] }).select('_id');
    filter.job = { $in: jobs.map((j) => j._id) };
  }
  const [items, total] = await Promise.all([
    Application.find(filter)
      .populate({
        path: 'job',
        select: 'title location jobType workMode salary salaryMin salaryMax deadline company',
        populate: { path: 'company', select: 'companyName logo verificationStatus' },
      })
      .populate('drive', 'driveTitle driveDate venue mode')
      .sort({ appliedAt: -1 })
      .skip(skip)
      .limit(limit),
    Application.countDocuments(filter),
  ]);
  const counts = await Application.aggregate([{ $match: { student: req.user._id } }, { $group: { _id: '$status', n: { $sum: 1 } } }]);
  res.json({ success: true, data: items, counts, pagination: { page, limit, total, pages: Math.max(1, Math.ceil(total / limit)) } });
});

const getOne = asyncHandler(async (req, res) => {
  const app = await Application.findById(req.params.id)
    .populate({ path: 'job', populate: { path: 'company', select: 'companyName email website city logo verificationStatus' } })
    .populate('student', 'name email')
    .populate('drive');
  if (!app) throw ApiError.notFound('Application not found');
  const uid = String(req.user._id);
  const isOwner = String(app.student._id || app.student) === uid;
  if (req.user.role === 'student' && !isOwner) throw ApiError.forbidden('Access denied');
  if (req.user.role === 'company') {
    const CompanyProfile = require('../models/CompanyProfile');
    const cp = await CompanyProfile.findOne({ user: req.user._id });
    if (!cp || String(app.job.company?._id || app.job.company) !== String(cp._id)) throw ApiError.forbidden('Access denied');
  }
  res.json({ success: true, data: app });
});

const updateStatus = asyncHandler(async (req, res) => {
  const { status, rejectionReason } = req.body;
  if (!APP_STATUSES.includes(status)) throw ApiError.badRequest('Invalid status.');
  const app = await Application.findById(req.params.id).populate('job');
  if (!app) throw ApiError.notFound('Application not found');
  if (req.user.role === 'company') {
    const CompanyProfile = require('../models/CompanyProfile');
    const cp = await CompanyProfile.findOne({ user: req.user._id });
    if (!cp || String(app.job.company?._id || app.job.company) !== String(cp._id)) throw ApiError.forbidden('Access denied');
  }
  app.status = status;
  app.rejectionReason = status === 'Rejected' ? (rejectionReason || null) : null;
  recordStatus(app, status, status === 'Rejected' ? (rejectionReason || null) : null, req.user._id);
  await app.save();
  await notifyUser(app.student, 'Application update', `Your application status is now ${status}.`, { type: 'application', referenceId: app._id, priority: 'high', actionUrl: '/student/applications' });
  audit('application_status', 'applications', `Application ${app._id} → ${status}`, req.user._id, req);
  res.json({ success: true, data: app });
});

module.exports = { apply, myApplications, getOne, updateStatus };
