const StudentProfile = require('../models/StudentProfile');
const { Education, Project, Certification, Resume, CareerPreference, CareerRoadmap } = require('../models/Student');
const { Skill, StudentSkill } = require('../models/Skill');
const { JobAlert } = require('../models/Job');
const { ApiError, asyncHandler, paginate, omit, PROTECTED_FIELDS } = require('../utils/helpers');
const { verifySniff, removeFile } = require('../middleware/upload');
const { atsScore } = require('../services/match.service');
const path = require('path');

const getMe = asyncHandler(async (req, res) => {
  const profile = await StudentProfile.findOne({ user: req.user._id });
  res.json({ success: true, data: { user: req.user, profile } });
});

const patchMe = asyncHandler(async (req, res) => {
  const allowed = ['phone', 'dob', 'gender', 'address', 'city', 'course', 'branch', 'semester', 'cgpa', 'passingYear', 'backlogs', 'about', 'enrollmentNo'];
  const profile = await StudentProfile.findOne({ user: req.user._id });
  if (!profile) throw ApiError.notFound('Profile not found');
  for (const k of allowed) if (req.body[k] !== undefined) profile[k] = req.body[k] === '' ? null : req.body[k];
  if (req.body.name && req.body.name !== req.user.name) {
    if (!/^[A-Za-z\s.\-]{2,120}$/.test(req.body.name)) throw ApiError.badRequest('Name must be 2–120 letters.');
    req.user.name = req.body.name; await req.user.save();
  }
  profile.recalcCompletion(); await profile.save();
  res.json({ success: true, data: { user: req.user, profile } });
});

const uploadPhoto = asyncHandler(async (req, res) => {
  if (!req.file) throw ApiError.badRequest('No file uploaded.');
  verifySniff('photo', req.file.path);
  const profile = await StudentProfile.findOne({ user: req.user._id });
  if (profile?.profilePhoto) removeFile(profile.profilePhoto);
  profile.profilePhoto = 'uploads/profile_photos/' + path.basename(req.file.path);
  profile.recalcCompletion(); await profile.save();
  res.json({ success: true, data: { profile } });
});

function crud(Model, { ownership = 'student', extra = {} } = {}) {
  return {
    list: asyncHandler(async (req, res) => {
      const { page, limit, skip } = paginate(req.query);
      const filter = { student: req.user._id, ...extra };
      const [items, total] = await Promise.all([Model.find(filter).sort({ _id: -1 }).skip(skip).limit(limit), Model.countDocuments(filter)]);
      res.json({ success: true, data: items, pagination: { page, limit, total, pages: Math.max(1, Math.ceil(total / limit)) } });
    }),
    create: asyncHandler(async (req, res) => {
      const item = await Model.create({ ...req.body, student: req.user._id });
      res.status(201).json({ success: true, data: item });
    }),
    update: asyncHandler(async (req, res) => {
      const item = await Model.findOne({ _id: req.params.id, student: req.user._id });
      if (!item) throw ApiError.notFound('Record not found');
      Object.assign(item, omit(req.body, PROTECTED_FIELDS)); await item.save();
      res.json({ success: true, data: item });
    }),
    remove: asyncHandler(async (req, res) => {
      const item = await Model.findOneAndDelete({ _id: req.params.id, student: req.user._id });
      if (!item) throw ApiError.notFound('Record not found');
      res.json({ success: true, data: { message: 'Deleted' } });
    }),
  };
}

const education = crud(Education);
const projects = crud(Project);
const certifications = crud(Certification);

const mySkills = asyncHandler(async (req, res) => {
  const items = await StudentSkill.find({ student: req.user._id }).populate('skill');
  res.json({ success: true, data: items });
});
const addSkill = asyncHandler(async (req, res) => {
  const { skillId, skillName, proficiency = 'Intermediate', category } = req.body;
  let skill = null;
  if (skillId) skill = await Skill.findById(skillId);
  else if (skillName) {
    skill = await Skill.findOne({ skillName: new RegExp(`^${skillName.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'i') });
    if (!skill) skill = await Skill.create({ skillName: skillName.trim(), category: category || null });
  }
  if (!skill) throw ApiError.badRequest('skillId or skillName is required.');
  const dup = await StudentSkill.findOne({ student: req.user._id, skill: skill._id });
  if (dup) throw ApiError.conflict('Skill already added.');
  const row = await StudentSkill.create({ student: req.user._id, skill: skill._id, proficiency });
  res.status(201).json({ success: true, data: await row.populate('skill') });
});
const removeSkill = asyncHandler(async (req, res) => {
  const row = await StudentSkill.findOneAndDelete({ student: req.user._id, skill: req.params.skillId });
  if (!row) throw ApiError.notFound('Skill not found');
  res.json({ success: true, data: { message: 'Removed' } });
});
const allSkills = asyncHandler(async (req, res) => {
  const items = await Skill.find({}).sort({ skillName: 1 }).limit(200);
  res.json({ success: true, data: items });
});

const getResumes = asyncHandler(async (req, res) => {
  const items = await Resume.find({ student: req.user._id }).sort({ uploadedAt: -1 });
  res.json({ success: true, data: items });
});
const uploadResume = asyncHandler(async (req, res) => {
  if (!req.file) throw ApiError.badRequest('No file uploaded.');
  verifySniff('resume', req.file.path);
  const old = await Resume.find({ student: req.user._id });
  // Single-resume policy (parity with PHP): replace existing
  for (const o of old) { removeFile(o.filePath); await o.deleteOne(); }
  const r = await Resume.create({
    student: req.user._id, fileName: req.file.originalname,
    filePath: 'uploads/resumes/' + path.basename(req.file.path),
    fileType: req.file.mimetype, fileSize: req.file.size,
  });
  res.status(201).json({ success: true, data: r });
});
const deleteResume = asyncHandler(async (req, res) => {
  const r = await Resume.findOne({ _id: req.params.id, student: req.user._id });
  if (!r) throw ApiError.notFound('Resume not found');
  removeFile(r.filePath); await r.deleteOne();
  res.json({ success: true, data: { message: 'Resume deleted' } });
});
const downloadResume = asyncHandler(async (req, res) => {
  const r = await Resume.findById(req.params.id);
  if (!r) throw ApiError.notFound('Resume not found');
  const isOwner = String(r.student) === String(req.user._id);
  if (!isOwner && req.user.role === 'student') throw ApiError.forbidden('Access denied');
  // company/tpo scoping enforced in dedicated routes; this generic route allows tpo/company
  if (!isOwner && !['tpo', 'company'].includes(req.user.role)) throw ApiError.forbidden('Access denied');
  const abs = path.join(__dirname, '../../', r.filePath);
  res.download(abs, r.fileName);
});
const getAts = asyncHandler(async (req, res) => {
  const data = await atsScore(req.user._id, { Education, Project, Certification, Resume });
  res.json({ success: true, data });
});

const PREFERENCE_FIELDS = ['preferredRole', 'preferredLocation', 'preferredJobType', 'expectedSalary', 'workMode', 'experienceLevel'];
const getPreferences = asyncHandler(async (req, res) => {
  const p = await CareerPreference.findOne({ student: req.user._id });
  res.json({ success: true, data: p });
});
const putPreferences = asyncHandler(async (req, res) => {
  const update = {};
  for (const k of PREFERENCE_FIELDS) update[k] = (req.body[k] === '' || req.body[k] === undefined) ? null : req.body[k];
  const p = await CareerPreference.findOneAndUpdate({ student: req.user._id }, { ...update, student: req.user._id }, { new: true, upsert: true, runValidators: true });
  res.json({ success: true, data: p });
});
const clearPreferences = asyncHandler(async (req, res) => {
  const update = {};
  for (const k of PREFERENCE_FIELDS) update[k] = null;
  const p = await CareerPreference.findOneAndUpdate({ student: req.user._id }, { ...update, student: req.user._id }, { new: true, upsert: true });
  res.json({ success: true, data: p });
});

const listAlerts = asyncHandler(async (req, res) => {
  res.json({ success: true, data: await JobAlert.find({ student: req.user._id }).sort({ _id: -1 }) });
});
const createAlert = asyncHandler(async (req, res) => {
  const a = await JobAlert.create({ ...req.body, student: req.user._id });
  res.status(201).json({ success: true, data: a });
});
const deleteAlert = asyncHandler(async (req, res) => {
  const a = await JobAlert.findOneAndDelete({ _id: req.params.id, student: req.user._id });
  if (!a) throw ApiError.notFound('Alert not found');
  res.json({ success: true, data: { message: 'Deleted' } });
});
const alertMatches = asyncHandler(async (req, res) => {
  const { Job } = require('../models/Job');
  const a = await JobAlert.findOne({ _id: req.params.id, student: req.user._id });
  if (!a) throw ApiError.notFound('Alert not found');
  const today = new Date(new Date().toDateString());
  const jobs = await Job.find({ approvalStatus: 'approved', status: 'Open', deadline: { $gte: today }, title: new RegExp(a.roleKeyword || '', 'i') }).limit(5).populate('company', 'companyName');
  res.json({ success: true, data: jobs });
});

module.exports = {
  getMe, patchMe, uploadPhoto, education, projects, certifications,
  mySkills, addSkill, removeSkill, allSkills,
  getResumes, uploadResume, deleteResume, downloadResume, getAts,
  getPreferences, putPreferences, clearPreferences, listAlerts, createAlert, deleteAlert, alertMatches,
};
