const CompanyProfile = require('../models/CompanyProfile');
const CompanyDocument = require('../models/CompanyDocument');
const { Job, JobSkill } = require('../models/Job');
const { Skill } = require('../models/Skill');
const { Application } = require('../models/Application');
const { Notification } = require('../models/Misc');
const { ApiError, asyncHandler } = require('../utils/helpers');
const { verifySniff, removeFile } = require('../middleware/upload');
const { candidateMatch } = require('../services/match.service');
const { notifyTpos } = require('../services/notify.service');
const audit = require('../services/audit.service');
const path = require('path');

/** Copy only whitelisted keys from src into dst (prevents mass-assignment). */
function assignFields(dst, src, allowed) {
  for (const k of allowed) if (Object.prototype.hasOwnProperty.call(src, k)) dst[k] = src[k];
}

const COMPANY_JOB_FIELDS = ['title', 'description', 'qualification', 'experience', 'salaryMin', 'salaryMax', 'location', 'jobType', 'workMode', 'vacancies', 'internshipDuration', 'stipend', 'deadline'];
const COMPANY_PROFILE_FIELDS = ['companyName', 'industry', 'website', 'email', 'phone', 'address', 'city', 'description'];

async function syncJobSkills(jobId, skills) {
  if (!Array.isArray(skills)) return;
  await JobSkill.deleteMany({ job: jobId });
  for (const s of skills) {
    let skill = s.skillId ? await Skill.findById(s.skillId) : await Skill.findOne({ skillName: new RegExp(`^${String(s.skillName || '').trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'i') });
    if (!skill && s.skillName) skill = await Skill.create({ skillName: s.skillName.trim() });
    if (skill) await JobSkill.updateOne({ job: jobId, skill: skill._id }, { job: jobId, skill: skill._id }, { upsert: true });
  }
}

async function ownCompany(userId, autoCreate, name, email) {
  let cp = await CompanyProfile.findOne({ user: userId });
  if (!cp && autoCreate) cp = await CompanyProfile.create({ user: userId, companyName: name || 'My Company', email: email || '', verificationStatus: 'pending' });
  if (!cp) throw ApiError.badRequest('Company profile not found.');
  return cp;
}

const dashboard = asyncHandler(async (req, res) => {
  const cp = await ownCompany(req.user._id, true, req.user.name, req.user.email);
  const jobs = await Job.find({ company: cp._id }).select('_id approvalStatus');
  const jobIds = jobs.map((j) => j._id);
  const [apps, interviews, offers, assessments, unread, shortlisted, newApps] = await Promise.all([
    Application.countDocuments({ job: { $in: jobIds } }),
    require('../models/Drive').Interview.countDocuments({ company: cp._id, status: 'scheduled' }),
    require('../models/Application').Offer.countDocuments({ company: cp._id, status: { $in: ['pending', 'issued', 'viewed'] } }),
    require('../models/Assessment').Assessment.countDocuments({ company: cp._id }),
    Notification.countDocuments({ user: req.user._id, isRead: false }),
    Application.countDocuments({ job: { $in: jobIds }, status: { $in: ['Shortlisted', 'Assessment', 'Interview', 'Selected'] } }),
    Application.countDocuments({ job: { $in: jobIds }, status: 'Applied' }),
  ]);
  const recentApps = await Application.find({ job: { $in: jobIds } }).populate('student', 'name email').populate('job', 'title').sort({ appliedAt: -1 }).limit(5);
  res.json({ success: true, data: { profile: cp, kpis: { jobs: jobs.length, approvedJobs: jobs.filter((j) => j.approvalStatus === 'approved').length, pendingJobs: jobs.filter((j) => j.approvalStatus === 'pending').length, applications: apps, newApps, shortlisted, interviews, offers, assessments, unread }, recentApps } });
});

const getProfile = asyncHandler(async (req, res) => {
  res.json({ success: true, data: await ownCompany(req.user._id, true, req.user.name, req.user.email) });
});
const patchProfile = asyncHandler(async (req, res) => {
  const cp = await ownCompany(req.user._id, true, req.user.name, req.user.email);
  assignFields(cp, req.body, COMPANY_PROFILE_FIELDS); await cp.save();
  res.json({ success: true, data: cp });
});
const uploadLogo = asyncHandler(async (req, res) => {
  if (!req.file) throw ApiError.badRequest('No file uploaded.');
  verifySniff('logo', req.file.path);
  const cp = await ownCompany(req.user._id, true, req.user.name, req.user.email);
  if (cp.logo) removeFile(cp.logo);
  cp.logo = 'uploads/company_logos/' + path.basename(req.file.path);
  await cp.save();
  res.json({ success: true, data: cp });
});

const listDocs = asyncHandler(async (req, res) => {
  const cp = await ownCompany(req.user._id);
  res.json({ success: true, data: await CompanyDocument.find({ company: cp._id }).sort({ uploadedAt: -1 }) });
});
const uploadDoc = asyncHandler(async (req, res) => {
  if (!req.file) throw ApiError.badRequest('No file uploaded.');
  verifySniff('document', req.file.path);
  const cp = await ownCompany(req.user._id);
  const doc = await CompanyDocument.create({ company: cp._id, documentType: req.body.documentType || 'Other', documentName: req.file.originalname, documentPath: 'uploads/company_documents/' + path.basename(req.file.path) });
  await notifyTpos('Company document uploaded', `${cp.companyName} uploaded ${doc.documentType} for verification.`, { type: 'company', referenceId: cp._id });
  res.status(201).json({ success: true, data: doc });
});
const deleteDoc = asyncHandler(async (req, res) => {
  const cp = await ownCompany(req.user._id);
  const doc = await CompanyDocument.findOne({ _id: req.params.id, company: cp._id });
  if (!doc) throw ApiError.notFound('Document not found');
  removeFile(doc.documentPath); await doc.deleteOne();
  res.json({ success: true, data: { message: 'Deleted' } });
});

const getJob = asyncHandler(async (req, res) => {
  const cp = await ownCompany(req.user._id);
  const job = await Job.findOne({ _id: req.params.id, company: cp._id });
  if (!job) throw ApiError.notFound('Job not found');
  const skills = await JobSkill.find({ job: job._id }).populate('skill', 'skillName category');
  const [applications, recentApps] = await Promise.all([
    Application.countDocuments({ job: job._id }),
    Application.find({ job: job._id }).populate('student', 'name email').sort({ appliedAt: -1 }).limit(10),
  ]);
  res.json({ success: true, data: { job, skills, applications, recentApps } });
});

const createJob = asyncHandler(async (req, res) => {
  const cp = await ownCompany(req.user._id);
  if (cp.verificationStatus !== 'verified') throw ApiError.forbidden('Your company must be verified before posting jobs.');
  const { skills } = req.body;
  const job = new Job({ company: cp._id, status: 'Open', approvalStatus: 'pending' });
  assignFields(job, req.body, COMPANY_JOB_FIELDS);
  await job.save();
  if (Array.isArray(skills)) await syncJobSkills(job._id, skills);
  await notifyTpos('New job awaiting approval', `${cp.companyName} posted ${job.title}.`, { type: 'job', referenceId: job._id, actionUrl: '/tpo/jobs' });
  audit('job_create', 'jobs', `${cp.companyName} posted ${job.title}`, req.user._id, req);
  res.status(201).json({ success: true, data: job });
});
const listJobs = asyncHandler(async (req, res) => {
  const cp = await ownCompany(req.user._id);
  const filter = { company: cp._id };
  if (req.query.status) filter.status = req.query.status;
  if (req.query.approvalStatus) filter.approvalStatus = req.query.approvalStatus;
  const jobs = await Job.find(filter).sort({ createdAt: -1 });
  const withCounts = await Promise.all(jobs.map(async (j) => ({ job: j, applications: await Application.countDocuments({ job: j._id }) })));
  res.json({ success: true, data: withCounts });
});
const patchJob = asyncHandler(async (req, res) => {
  const cp = await ownCompany(req.user._id);
  const job = await Job.findOne({ _id: req.params.id, company: cp._id });
  if (!job) throw ApiError.notFound('Job not found');
  assignFields(job, req.body, COMPANY_JOB_FIELDS);
  await job.save();
  if (Object.prototype.hasOwnProperty.call(req.body, 'skills')) await syncJobSkills(job._id, req.body.skills);
  res.json({ success: true, data: job });
});
const toggleJob = asyncHandler(async (req, res) => {
  const cp = await ownCompany(req.user._id);
  const job = await Job.findOne({ _id: req.params.id, company: cp._id });
  if (!job) throw ApiError.notFound('Job not found');
  job.status = job.status === 'Open' ? 'Closed' : 'Open'; await job.save();
  res.json({ success: true, data: job });
});
const deleteJob = asyncHandler(async (req, res) => {
  const cp = await ownCompany(req.user._id);
  const job = await Job.findOne({ _id: req.params.id, company: cp._id });
  if (!job) throw ApiError.notFound('Job not found');
  if (await Application.countDocuments({ job: job._id })) throw ApiError.conflict('Cannot delete a job with applications. Close it instead.');
  await JobSkill.deleteMany({ job: job._id });
  await job.deleteOne();
  res.json({ success: true, data: { message: 'Deleted' } });
});

const listApplications = asyncHandler(async (req, res) => {
  const cp = await ownCompany(req.user._id);
  const jobs = await Job.find({ company: cp._id }).select('_id');
  const filter = { job: { $in: jobs.map((j) => j._id) } };
  if (req.query.jobId) filter.job = req.query.jobId;
  if (req.query.status) filter.status = req.query.status;
  const apps = await Application.find(filter).populate('student', 'name email').populate('job', 'title location').sort({ appliedAt: -1 });
  const ranked = await Promise.all(apps.map(async (a) => ({ application: a, match: await candidateMatch(a.student._id || a.student, a.job._id || a.job) })));
  ranked.sort((x, y) => y.match.score - x.match.score);
  res.json({ success: true, data: ranked });
});
const getApplication = asyncHandler(async (req, res) => {
  const cp = await ownCompany(req.user._id);
  const app = await Application.findById(req.params.id).populate('student', 'name email').populate('job').populate('drive');
  if (!app) throw ApiError.notFound('Application not found');
  if (String(app.job.company) !== String(cp._id)) throw ApiError.forbidden('Access denied');
  const StudentProfile = require('../models/StudentProfile');
  const { Education, Project, Certification, Resume } = require('../models/Student');
  const { StudentSkill } = require('../models/Skill');
  const sid = app.student._id || app.student;
  const [profile, education, projects, certifications, resumes, skills] = await Promise.all([
    StudentProfile.findOne({ user: sid }),
    Education.find({ student: sid }),
    Project.find({ student: sid }),
    Certification.find({ student: sid }),
    Resume.find({ student: sid }).sort({ uploadedAt: -1 }),
    StudentSkill.find({ student: sid }).populate('skill', 'skillName category'),
  ]);
  res.json({ success: true, data: { application: app, profile, education, projects, certifications, resumes, skills, match: await candidateMatch(sid, app.job._id || app.job) } });
});
const shortlisted = asyncHandler(async (req, res) => {
  const cp = await ownCompany(req.user._id);
  const jobs = await Job.find({ company: cp._id }).select('_id');
  res.json({ success: true, data: await Application.find({ job: { $in: jobs.map((j) => j._id) }, status: 'Shortlisted' }).populate('student', 'name email').populate('job', 'title').sort({ appliedAt: -1 }) });
});

module.exports = { dashboard, getProfile, patchProfile, uploadLogo, listDocs, uploadDoc, deleteDoc, getJob, createJob, listJobs, patchJob, toggleJob, deleteJob, listApplications, getApplication, shortlisted };
