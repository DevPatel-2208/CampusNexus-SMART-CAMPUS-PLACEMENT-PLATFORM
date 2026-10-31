const User = require('../models/User');
const StudentProfile = require('../models/StudentProfile');
const CompanyProfile = require('../models/CompanyProfile');
const { Job, JobSkill } = require('../models/Job');
const { Skill } = require('../models/Skill');
const { Application, Selection, Offer, Placement } = require('../models/Application');
const { PlacementDrive, DriveRegistration, Interview } = require('../models/Drive');
const { Assessment, AssessmentQuestion, AssessmentAttempt, ExamViolation } = require('../models/Assessment');
const { Notification, Announcement, AuditLog } = require('../models/Misc');
const { ApiError, asyncHandler, paginate, escapeRegex } = require('../utils/helpers');
const { notifyUser } = require('../services/notify.service');
const audit = require('../services/audit.service');

const dashboard = asyncHandler(async (req, res) => {
  const today = new Date(new Date().toDateString());
  const [students, placed, companies, pendingCompanies, jobs, pendingJobs, openJobs, drives, apps, appsToday, pendingApps, interviews, placements, onHold] = await Promise.all([
    User.countDocuments({ role: 'student' }),
    StudentProfile.countDocuments({ placementStatus: 'placed' }),
    CompanyProfile.countDocuments({}),
    CompanyProfile.countDocuments({ verificationStatus: 'pending' }),
    Job.countDocuments({}), Job.countDocuments({ approvalStatus: 'pending' }),
    Job.countDocuments({ status: 'Open', approvalStatus: 'approved' }),
    PlacementDrive.countDocuments({}),
    Application.countDocuments({}),
    Application.countDocuments({ appliedAt: { $gte: today } }),
    Application.countDocuments({ status: { $in: ['Applied', 'Under Review'] } }),
    Interview.countDocuments({ status: 'scheduled', interviewDate: { $gte: today } }),
    Placement.countDocuments({}),
    Selection.countDocuments({ selectionStatus: 'On Hold' }),
  ]);
  const recent = await AuditLog.find({}).populate('user', 'name role').sort({ createdAt: -1 }).limit(8);
  res.json({ success: true, data: { kpis: { students, placed, companies, pendingCompanies, jobs, pendingJobs, openJobs, drives, apps, appsToday, pendingApps, interviews, placements, onHold }, recent } });
});

const analytics = asyncHandler(async (req, res) => {
  const [
    byBranch, byStatus, byCompany, byJobType, byCourse, bySkillRaw, byDriveRaw,
    students, placed, eligibleStudents, shortlisted, interviewCount, selected, offers, apps,
  ] = await Promise.all([
    StudentProfile.aggregate([{ $group: { _id: '$branch', n: { $sum: 1 } } }, { $sort: { n: -1 } }, { $limit: 10 }]),
    Application.aggregate([{ $group: { _id: '$status', n: { $sum: 1 } } }]),
    Placement.aggregate([{ $group: { _id: '$company', n: { $sum: 1 } } }, { $sort: { n: -1 } }, { $limit: 8 }]),
    Job.aggregate([{ $group: { _id: '$jobType', n: { $sum: 1 } } }]),
    StudentProfile.aggregate([{ $group: { _id: '$course', n: { $sum: 1 } } }, { $sort: { n: -1 } }, { $limit: 8 }]),
    JobSkill.aggregate([{ $group: { _id: '$skill', n: { $sum: 1 } } }, { $sort: { n: -1 } }, { $limit: 8 }]),
    DriveRegistration.aggregate([{ $group: { _id: '$drive', n: { $sum: 1 } } }, { $sort: { n: -1 } }, { $limit: 8 }]),
    User.countDocuments({ role: 'student' }),
    StudentProfile.countDocuments({ placementStatus: 'placed' }),
    DriveRegistration.distinct('student', { eligibilityStatus: 'eligible' }),
    Application.countDocuments({ status: 'Shortlisted' }),
    Interview.countDocuments({}),
    Selection.countDocuments({ selectionStatus: 'Selected' }),
    Offer.countDocuments({}),
    Application.countDocuments({}),
  ]);
  const [companies, skills, drives] = await Promise.all([
    CompanyProfile.find({ _id: { $in: byCompany.map((x) => x._id) } }).select('companyName'),
    Skill.find({ _id: { $in: bySkillRaw.map((x) => x._id) } }).select('skillName'),
    PlacementDrive.find({ _id: { $in: byDriveRaw.map((x) => x._id) } }).select('driveTitle'),
  ]);
  const nameOf = new Map(companies.map((c) => [String(c._id), c.companyName]));
  const skillOf = new Map(skills.map((s) => [String(s._id), s.skillName]));
  const driveOf = new Map(drives.map((d) => [String(d._id), d.driveTitle]));
  const statusMap = new Map(byStatus.map((x) => [x._id, x.n]));
  const funnel = [
    { name: 'Applied', value: apps },
    { name: 'Shortlisted', value: statusMap.get('Shortlisted') || 0 },
    { name: 'Interview', value: (statusMap.get('Assessment') || 0) + (statusMap.get('Interview') || 0) },
    { name: 'Selected', value: (statusMap.get('Selected') || 0) + (statusMap.get('Offer') || 0) },
    { name: 'Placed', value: statusMap.get('Placed') || 0 },
  ];
  const rate = students ? Number(((placed * 100) / students).toFixed(1)) : 0;
  res.json({
    success: true,
    data: {
      byBranch, byStatus, byJobType,
      byCompany: byCompany.map((x) => ({ company: nameOf.get(String(x._id)) || '—', n: x.n })),
      byCourse: byCourse.map((x) => ({ course: x._id || 'Unknown', n: x.n })),
      bySkill: bySkillRaw.map((x) => ({ skill: skillOf.get(String(x._id)) || '—', n: x.n })),
      byDrive: byDriveRaw.map((x) => ({ drive: driveOf.get(String(x._id)) || '—', n: x.n })),
      funnel,
      stats: { students, eligible: eligibleStudents.length, apps, shortlisted, interviews: interviewCount, selections: selected, offers, placed, rate },
    },
  });
});

const students = asyncHandler(async (req, res) => {
  const { page, limit } = paginate(req.query);
  const { search, branch, course, year, status, sort } = req.query;
  const userMatch = { role: 'student' };

  const users = await User.find(userMatch);
  const profiles = await StudentProfile.find({ user: { $in: users.map((u) => u._id) } });
  const pmap = new Map(profiles.map((p) => [String(p.user), p]));
  let rows = users.map((u) => ({ user: u, profile: pmap.get(String(u._id)) || null }));

  const rx = search ? new RegExp(escapeRegex(search), 'i') : null;
  const branches = [...new Set(rows.map((r) => r.profile?.branch).filter(Boolean))].sort();
  const courses = [...new Set(rows.map((r) => r.profile?.course).filter(Boolean))].sort();
  const years = [...new Set(rows.map((r) => r.profile?.passingYear).filter((y) => y != null))].sort((a, b) => b - a);
  rows = rows.filter((r) => {
    if (rx && !(rx.test(r.user.name || '') || rx.test(r.user.email || '') || rx.test(r.profile?.enrollmentNo || ''))) return false;
    if (branch && r.profile?.branch !== branch) return false;
    if (course && r.profile?.course !== course) return false;
    if (year && String(r.profile?.passingYear ?? '') !== String(year)) return false;
    if (status && r.profile?.placementStatus !== status) return false;
    return true;
  });

  const key = String(sort || 'name').replace(/^-/, '');
  const dir = String(sort || '').startsWith('-') ? -1 : 1;
  const sortVal = (r) => {
    if (key === 'branch') return (r.profile?.branch || '').toLowerCase();
    if (key === 'cgpa') return r.profile?.cgpa ?? -1;
    if (key === 'year') return r.profile?.passingYear ?? 0;
    return (r.user.name || '').toLowerCase();
  };
  rows.sort((a, b) => { const x = sortVal(a); const y = sortVal(b); return x < y ? -dir : x > y ? dir : 0; });

  const placed = rows.filter((r) => r.profile?.placementStatus === 'placed').length;
  const cgpas = rows.map((r) => r.profile?.cgpa).filter((c) => typeof c === 'number');
  const avgCgpa = cgpas.length ? Number((cgpas.reduce((a, b) => a + b, 0) / cgpas.length).toFixed(2)) : null;
  const total = rows.length;
  const data = rows.slice((page - 1) * limit, page * limit);

  res.json({
    success: true,
    data,
    summary: { total, placed, notPlaced: total - placed, avgCgpa },
    filters: { branches, courses, years },
    pagination: { page, limit, total, pages: Math.max(1, Math.ceil(total / limit)) },
  });
});
const studentDetail = asyncHandler(async (req, res) => {
  const user = await User.findById(req.params.id);
  if (!user || user.role !== 'student') throw ApiError.notFound('Student not found');
  const profile = await StudentProfile.findOne({ user: user._id });
  const { Education, Project, Certification, Resume } = require('../models/Student');
  const { StudentSkill } = require('../models/Skill');
  const [education, projectsF, certs, resumes, skills, apps, interviews, offers, placements] = await Promise.all([
    Education.find({ student: user._id }), Project.find({ student: user._id }), Certification.find({ student: user._id }),
    Resume.find({ student: user._id }).sort({ uploadedAt: -1 }), StudentSkill.find({ student: user._id }).populate('skill'),
    Application.find({ student: user._id }).populate('job', 'title').sort({ appliedAt: -1 }),
    Interview.find({ student: user._id }).populate('company', 'companyName').sort({ interviewDate: -1 }),
    Offer.find({ student: user._id }).populate('company', 'companyName').populate('job', 'title').sort({ createdAt: -1 }),
    Placement.find({ student: user._id }).populate('company', 'companyName').sort({ placementDate: -1 }),
  ]);
  res.json({ success: true, data: { user, profile, education, projects: projectsF, certifications: certs, resumes, skills, applications: apps, interviews, offers, placements } });
});
const studentStatus = asyncHandler(async (req, res) => {
  const user = await User.findById(req.params.id);
  if (!user || user.role !== 'student') throw ApiError.notFound('Student not found');
  if (!['active', 'inactive', 'blocked'].includes(req.body.status)) throw ApiError.badRequest('Invalid status.');
  user.status = req.body.status; await user.save();
  audit('student_status', 'students', `Student ${user.email} → ${user.status}`, req.user._id, req);
  res.json({ success: true, data: user });
});

const companies = asyncHandler(async (req, res) => {
  const items = await CompanyProfile.find({}).populate('user', 'name email status').sort({ createdAt: -1 });
  const withCounts = await Promise.all(items.map(async (c) => ({ company: c, approvedJobs: await Job.countDocuments({ company: c._id, approvalStatus: 'approved' }), docs: await require('../models/CompanyDocument').countDocuments({ company: c._id }) })));
  res.json({ success: true, data: withCounts });
});
const verifyCompany = asyncHandler(async (req, res) => {
  const cp = await CompanyProfile.findById(req.params.id);
  if (!cp) throw ApiError.notFound('Company not found');
  if (!['verified', 'rejected', 'suspended'].includes(req.body.status)) throw ApiError.badRequest('Invalid status.');
  cp.verificationStatus = req.body.status; await cp.save();
  await notifyUser(cp.user, req.body.status === 'verified' ? 'Company verified' : `Verification ${req.body.status}`, `${cp.companyName} verification status: ${req.body.status}.`, { type: 'verification', referenceId: cp._id, actionUrl: '/company/dashboard' });
  audit('company_verify', 'companies', `${cp.companyName} → ${req.body.status}`, req.user._id, req);
  res.json({ success: true, data: cp });
});

const companyDetail = asyncHandler(async (req, res) => {
  const cp = await CompanyProfile.findById(req.params.id).populate('user', 'name email status');
  if (!cp) throw ApiError.notFound('Company not found');
  const CompanyDocument = require('../models/CompanyDocument');
  const companyJobIds = await Job.find({ company: cp._id }).select('_id');
  const [docs, jobs, drives, appsTotal, approvedJobs, openJobs, selectedCnt, placementsCnt] = await Promise.all([
    CompanyDocument.find({ company: cp._id }).sort({ createdAt: -1 }),
    Job.aggregate([
      { $match: { company: cp._id } },
      { $sort: { createdAt: -1 } },
      { $limit: 10 },
      { $lookup: { from: 'applications', localField: '_id', foreignField: 'job', as: 'apps' } },
      { $addFields: { appsCount: { $size: '$apps' } } },
      { $project: { apps: 0 } },
    ]),
    PlacementDrive.find({ company: cp._id }).sort({ driveDate: -1 }).limit(6),
    Application.countDocuments({ job: { $in: companyJobIds } }),
    Job.countDocuments({ company: cp._id, approvalStatus: 'approved' }),
    Job.countDocuments({ company: cp._id, approvalStatus: 'approved', status: 'Open' }),
    Selection.countDocuments({ company: cp._id, selectionStatus: 'Selected' }),
    Placement.countDocuments({ company: cp._id }),
  ]);
  res.json({ success: true, data: { company: cp, docs, jobs, drives, counts: { appsTotal, approvedJobs, openJobs, selectedCnt, placementsCnt } } });
});

const jobs = asyncHandler(async (req, res) => {
  const { page, limit, skip } = paginate(req.query);
  const filter = {};
  for (const k of ['status', 'approvalStatus', 'jobType']) if (req.query[k]) filter[k] = req.query[k];
  if (req.query.search) filter.title = new RegExp(escapeRegex(String(req.query.search).trim()), 'i');
  const [items, total] = await Promise.all([
    Job.find(filter).populate('company', 'companyName').sort({ createdAt: -1 }).skip(skip).limit(limit),
    Job.countDocuments(filter),
  ]);
  const ids = items.map((j) => j._id);
  const counts = await Application.aggregate([{ $match: { job: { $in: ids } } }, { $group: { _id: '$job', n: { $sum: 1 } } }]);
  const map = new Map(counts.map((c) => [String(c._id), c.n]));
  const data = items.map((j) => ({ ...j.toObject(), appsCount: map.get(String(j._id)) || 0 }));
  res.json({ success: true, data, pagination: { page, limit, total, pages: Math.max(1, Math.ceil(total / limit)) } });
});
const approveJob = asyncHandler(async (req, res) => {
  const job = await Job.findById(req.params.id).populate('company');
  if (!job) throw ApiError.notFound('Job not found');
  if (!['approved', 'rejected'].includes(req.body.status)) throw ApiError.badRequest('Invalid status.');
  job.approvalStatus = req.body.status;
  job.rejectionReason = req.body.status === 'rejected' ? (req.body.rejectionReason || null) : null;
  await job.save();
  await notifyUser(job.company.user, req.body.status === 'approved' ? 'Job approved' : 'Job rejected', `${job.title} was ${req.body.status}.${req.body.status === 'rejected' && req.body.rejectionReason ? ` Reason: ${req.body.rejectionReason}` : ''}`, { type: 'job', referenceId: job._id, actionUrl: '/company/jobs' });
  audit('job_approval', 'jobs', `Job ${job.title} → ${req.body.status}`, req.user._id, req);
  res.json({ success: true, data: job });
});

const applications = asyncHandler(async (req, res) => {
  const { page, limit, skip } = paginate(req.query);
  const filter = {};
  if (req.query.status) filter.status = req.query.status;
  if (req.query.jobId) filter.job = req.query.jobId;
  if (req.query.search) {
    const rx = new RegExp(escapeRegex(req.query.search), 'i');
    const [jobs, comps, studs] = await Promise.all([
      Job.find({ title: rx }).select('_id'),
      CompanyProfile.find({ companyName: rx }).select('_id'),
      User.find({ role: 'student', $or: [{ name: rx }, { email: rx }] }).select('_id'),
    ]);
    const jobsByComp = comps.length ? await Job.find({ company: { $in: comps.map((c) => c._id) } }).select('_id') : [];
    const jobIds = [...jobs.map((j) => j._id), ...jobsByComp.map((j) => j._id)];
    filter.$or = [{ job: { $in: jobIds } }, { student: { $in: studs.map((s) => s._id) } }];
  }
  const [items, total] = await Promise.all([
    Application.find(filter).populate('student', 'name email').populate({ path: 'job', populate: { path: 'company', select: 'companyName' } }).sort({ appliedAt: -1 }).skip(skip).limit(limit),
    Application.countDocuments(filter),
  ]);
  res.json({ success: true, data: items, pagination: { page, limit, total, pages: Math.max(1, Math.ceil(total / limit)) } });
});

const attempts = asyncHandler(async (req, res) => {
  const { page, limit, skip } = paginate(req.query);
  const [items, total] = await Promise.all([
    AssessmentAttempt.find({}).populate('student', 'name email').populate('assessment', 'title').sort({ createdAt: -1 }).skip(skip).limit(limit),
    AssessmentAttempt.countDocuments({}),
  ]);
  res.json({ success: true, data: items, pagination: { page, limit, total, pages: Math.max(1, Math.ceil(total / limit)) } });
});
const assessmentAttempts = asyncHandler(async (req, res) => {
  const { page, limit, skip } = paginate(req.query, { limit: 15 });
  const assessment = await Assessment.findById(req.params.id).populate('company', 'companyName').populate('job', 'title');
  if (!assessment) throw ApiError.notFound('Assessment not found');
  const filter = { assessment: assessment._id };
  const result = String(req.query.result || '');
  if (['Passed', 'Failed', 'Pending'].includes(result)) filter.result = result;
  const search = String(req.query.q || '').trim();
  if (search) {
    const rx = new RegExp(escapeRegex(search), 'i');
    const [users, profiles] = await Promise.all([
      User.find({ role: 'student', $or: [{ name: rx }, { email: rx }] }).select('_id').limit(1000),
      StudentProfile.find({ $or: [{ enrollmentNo: rx }, { course: rx }, { branch: rx }] }).select('user'),
    ]);
    const studentIds = [...new Set([...users.map((u) => String(u._id)), ...profiles.map((p) => String(p.user))])];
    filter.student = studentIds.length ? { $in: studentIds } : { $exists: false };
  }
  const [attemptsList, total, passed, failed, pending] = await Promise.all([
    AssessmentAttempt.find(filter).populate('student', 'name email').sort({ createdAt: -1 }).skip(skip).limit(limit),
    AssessmentAttempt.countDocuments(filter),
    AssessmentAttempt.countDocuments({ assessment: assessment._id, result: 'Passed' }),
    AssessmentAttempt.countDocuments({ assessment: assessment._id, result: 'Failed' }),
    AssessmentAttempt.countDocuments({ assessment: assessment._id, $or: [{ result: 'Pending' }, { result: null }] }),
  ]);
  const studentIds = attemptsList.map((item) => item.student?._id).filter(Boolean);
  const profiles = await StudentProfile.find({ user: { $in: studentIds } }).select('user enrollmentNo course branch cgpa');
  const profileMap = new Map(profiles.map((profile) => [String(profile.user), profile]));
  const data = attemptsList.map((item) => ({ ...item.toObject(), studentProfile: profileMap.get(String(item.student?._id)) || null }));
  res.json({ success: true, assessment, data, pagination: { page, limit, total, pages: Math.max(1, Math.ceil(total / limit)) }, summary: { total: await AssessmentAttempt.countDocuments({ assessment: assessment._id }), passed, failed, pending } });
});
const tpoViolations = asyncHandler(async (req, res) => {
  res.json({ success: true, data: await ExamViolation.find({}).populate('student', 'name email').populate('attempt').sort({ occurredAt: -1 }).limit(100) });
});
const tpoAssessments = asyncHandler(async (req, res) => {
  const { page, limit, skip } = paginate(req.query, { limit: 15 });
  const filter = {};
  const search = String(req.query.q || '').trim();
  const status = String(req.query.status || '');
  if (['active', 'inactive', 'draft'].includes(status)) filter.status = status;
  if (req.query.company && /^[a-f\d]{24}$/i.test(String(req.query.company))) filter.company = req.query.company;
  if (search) {
    const rx = new RegExp(escapeRegex(search), 'i');
    const [companies, jobs] = await Promise.all([
      CompanyProfile.find({ companyName: rx }).select('_id'),
      Job.find({ title: rx }).select('_id'),
    ]);
    const or = [{ title: rx }];
    if (companies.length) or.push({ company: { $in: companies.map((c) => c._id) } });
    if (jobs.length) or.push({ job: { $in: jobs.map((j) => j._id) } });
    filter.$or = or;
  }
  const [items, total, assessmentCount, active, attemptsCount, passed, failed, pending, companies] = await Promise.all([
    Assessment.find(filter).populate('company', 'companyName').populate('job', 'title').sort({ createdAt: -1 }).skip(skip).limit(limit),
    Assessment.countDocuments(filter),
    Assessment.countDocuments({}),
    Assessment.countDocuments({ status: 'active' }),
    AssessmentAttempt.countDocuments({}),
    AssessmentAttempt.countDocuments({ result: 'Passed' }),
    AssessmentAttempt.countDocuments({ result: 'Failed' }),
    AssessmentAttempt.countDocuments({ $or: [{ result: 'Pending' }, { result: null }] }),
    CompanyProfile.find({}).select('_id companyName').sort({ companyName: 1 }),
  ]);
  const enriched = await Promise.all(items.map(async (assessment) => {
    const [questionCount, attemptCount, passedCount, failedCount, pendingCount] = await Promise.all([
      AssessmentQuestion.countDocuments({ assessment: assessment._id }),
      AssessmentAttempt.countDocuments({ assessment: assessment._id }),
      AssessmentAttempt.countDocuments({ assessment: assessment._id, result: 'Passed' }),
      AssessmentAttempt.countDocuments({ assessment: assessment._id, result: 'Failed' }),
      AssessmentAttempt.countDocuments({ assessment: assessment._id, $or: [{ result: 'Pending' }, { result: null }] }),
    ]);
    return { ...assessment.toObject(), questionCount, attemptCount, passedCount, failedCount, pendingCount };
  }));
  res.json({ success: true, data: enriched, pagination: { page, limit, total, pages: Math.max(1, Math.ceil(total / limit)) }, summary: { assessmentCount, active, attempts: attemptsCount, passed, failed, pending }, companies });
});

module.exports = { dashboard, analytics, students, studentDetail, studentStatus, companies, companyDetail, verifyCompany, jobs, approveJob, applications, attempts, assessmentAttempts, tpoViolations, tpoAssessments };
