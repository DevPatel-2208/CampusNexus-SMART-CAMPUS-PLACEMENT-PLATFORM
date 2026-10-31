const { Job, JobSkill, SavedJob } = require('../models/Job');
const CompanyProfile = require('../models/CompanyProfile');
const User = require('../models/User');
const { Application } = require('../models/Application');
const { Assessment, AssessmentQuestion, AssessmentAttempt } = require('../models/Assessment');
const { ExternalJobsCache } = require('../models/Misc');
const { ApiError, asyncHandler, paginate, escapeRegex } = require('../utils/helpers');
const { checkJobEligibility } = require('../services/eligibility.service');
const { matchBreakdown } = require('../services/match.service');
const StudentProfile = require('../models/StudentProfile');

function publicFilter(extra = {}) {
  const today = new Date(new Date().toDateString());
  return { approvalStatus: 'approved', status: 'Open', deadline: { $gte: today }, ...extra };
}

const listJobs = asyncHandler(async (req, res) => {
  const { page, limit, skip } = paginate(req.query);
  const { search, location, jobType, workMode, scope } = req.query;
  const privileged = req.user && ['tpo', 'company'].includes(req.user.role) && scope === 'all';
  const filter = privileged ? {} : publicFilter();
  if (search) {
    const rx = new RegExp(escapeRegex(search), 'i');
    const or = [{ title: rx }, { description: rx }];
    const companies = await CompanyProfile.find({ companyName: rx }).select('_id').lean();
    if (companies.length) or.push({ company: { $in: companies.map((c) => c._id) } });
    filter.$or = or;
  }
  if (location) filter.location = new RegExp(escapeRegex(location), 'i');
  if (jobType) filter.jobType = jobType;
  if (workMode) filter.workMode = workMode;
  const sort = req.query.sort === 'deadline' ? { deadline: 1 } : { createdAt: -1 };
  const [items, total] = await Promise.all([
    Job.find(filter).populate('company', 'companyName logo city verificationStatus').sort(sort).skip(skip).limit(limit),
    Job.countDocuments(filter),
  ]);
  res.json({ success: true, data: items, pagination: { page, limit, total, pages: Math.max(1, Math.ceil(total / limit)) } });
});

const getJob = asyncHandler(async (req, res) => {
  const job = await Job.findById(req.params.id).populate('company', 'companyName logo city description website verificationStatus');
  if (!job) throw ApiError.notFound('Job not found');
  const skills = await JobSkill.find({ job: job._id }).populate('skill', 'skillName category');
  let application = null;
  let assessment = null;
  if (req.user && req.user.role === 'student') {
    application = await Application.findOne({ student: req.user._id, job: job._id }).select('_id status createdAt history coverLetter').lean();
    const activeAssessment = await Assessment.findOne({ job: job._id, status: 'active' })
      .populate('company', 'companyName logo')
      .lean();
    if (activeAssessment) {
      const [questionCount, attempt] = await Promise.all([
        AssessmentQuestion.countDocuments({ assessment: activeAssessment._id }),
        AssessmentAttempt.findOne({ assessment: activeAssessment._id, student: req.user._id }).lean(),
      ]);
      assessment = {
        _id: activeAssessment._id,
        title: activeAssessment.title,
        description: activeAssessment.description,
        durationMinutes: activeAssessment.durationMinutes,
        totalMarks: activeAssessment.totalMarks,
        numQuestions: activeAssessment.numQuestions || questionCount,
        questionCount,
        difficulty: activeAssessment.difficulty,
        categories: activeAssessment.categories,
        technology: activeAssessment.technology,
        passingPercentage: activeAssessment.passingPercentage,
        negativeMarking: activeAssessment.negativeMarking,
        negativeMarks: activeAssessment.negativeMarks,
        company: activeAssessment.company,
        attempt: attempt || null,
        unlocked: !!application,
      };
    }
  } else {
    const activeAssessment = await Assessment.findOne({ job: job._id, status: 'active' })
      .populate('company', 'companyName logo')
      .lean();
    if (activeAssessment) {
      const questionCount = await AssessmentQuestion.countDocuments({ assessment: activeAssessment._id });
      assessment = {
        _id: activeAssessment._id,
        title: activeAssessment.title,
        description: activeAssessment.description,
        durationMinutes: activeAssessment.durationMinutes,
        totalMarks: activeAssessment.totalMarks,
        numQuestions: activeAssessment.numQuestions || questionCount,
        questionCount,
        difficulty: activeAssessment.difficulty,
        categories: activeAssessment.categories,
        technology: activeAssessment.technology,
        passingPercentage: activeAssessment.passingPercentage,
        company: activeAssessment.company,
        unlocked: false,
      };
    }
  }
  res.json({ success: true, data: { job, skills, hasApplied: !!application, application, assessment } });
});

const jobEligibility = asyncHandler(async (req, res) => {
  const job = await Job.findById(req.params.id);
  if (!job) throw ApiError.notFound('Job not found');
  const profile = await StudentProfile.findOne({ user: req.user._id });
  res.json({ success: true, data: checkJobEligibility(job, profile) });
});

const recommended = asyncHandler(async (req, res) => {
  const jobs = await Job.find(publicFilter()).populate('company', 'companyName logo city').sort({ createdAt: -1 }).limit(60);
  const scored = [];
  for (const j of jobs) scored.push({ job: j, match: await matchBreakdown(j, req.user._id) });
  scored.sort((a, b) => b.match.score - a.match.score);
  res.json({ success: true, data: scored.slice(0, 20) });
});

const externalJobs = asyncHandler(async (req, res) => {
  const q = (req.query.q || '').toString();
  const loc = (req.query.loc || '').toString().trim();
  const internal = await Job.find({ ...publicFilter(), ...(q ? { title: new RegExp(escapeRegex(q), 'i') } : {}) }).limit(20).populate('company', 'companyName');
  let external = await ExternalJobsCache.find({ query: q }).sort({ fetchedAt: -1 }).limit(12);
  if (!external.length) {
    try {
      const ctrl = new AbortController();
      const t = setTimeout(() => ctrl.abort(), 8000);
      const r = await fetch('https://www.arbeitnow.com/api/job-board-api?search=' + encodeURIComponent(q), { signal: ctrl.signal, headers: { 'User-Agent': 'CampusNexus/1.0' } });
      clearTimeout(t);
      if (r.ok) {
        const data = await r.json();
        const list = (data.data || []).slice(0, 12);
        await ExternalJobsCache.deleteMany({ query: q });
        external = await ExternalJobsCache.insertMany(list.map((j) => ({
          title: j.title, companyName: j.company_name, location: j.location, salary: (j.job_types || []).join(', '),
          jobType: (j.job_types || [])[0] || '', description: j.description, applyUrl: j.url, source: 'Arbeitnow API', query: q,
        })));
      }
    } catch { /* offline — return cached/empty */ }
  }
  if (loc) external = external.filter((x) => String(x.location || '').toLowerCase().includes(loc.toLowerCase()));
  res.json({ success: true, data: { internal, external }, meta: { internalCount: internal.length, externalCount: external.length } });
});

const listSaved = asyncHandler(async (req, res) => {
  const { page, limit, skip } = paginate(req.query);
  const q = (req.query.q || '').toString().trim().toLowerCase();
  let items = await SavedJob.find({ student: req.user._id }).populate({ path: 'job', populate: { path: 'company', select: 'companyName verificationStatus logo' } }).sort({ _id: -1 });
  if (q) items = items.filter((s) => `${s.job?.title || ''} ${s.job?.company?.companyName || ''}`.toLowerCase().includes(q));
  const total = items.length;
  const paged = items.slice(skip, skip + limit);

  // Cross-reference with student's active applications
  const jobIds = paged.map((s) => s.job?._id).filter(Boolean);
  const applications = await Application.find({ student: req.user._id, job: { $in: jobIds } }).select('_id job status createdAt').lean();
  const appMap = new Map(applications.map((a) => [String(a.job), a]));

  const enriched = paged.map((s) => {
    const raw = s.toObject ? s.toObject() : s;
    const app = raw.job ? appMap.get(String(raw.job._id)) : null;
    return {
      ...raw,
      hasApplied: !!app,
      application: app || null,
    };
  });

  res.json({ success: true, data: enriched, pagination: { page, limit, total, pages: Math.max(1, Math.ceil(total / limit)) } });
});
const saveJob = asyncHandler(async (req, res) => {
  const job = await Job.findById(req.body.jobId);
  if (!job) throw ApiError.notFound('Job not found');
  if (job.status !== 'Open' || job.approvalStatus !== 'approved' || new Date(job.deadline) < new Date(new Date().toDateString())) {
    throw ApiError.badRequest('Only open, approved jobs can be saved.');
  }
  try {
    const row = await SavedJob.create({ student: req.user._id, job: job._id });
    res.status(201).json({ success: true, data: row });
  } catch (e) {
    if (e.code === 11000) throw ApiError.conflict('Job already saved.');
    throw e;
  }
});
const unsaveJob = asyncHandler(async (req, res) => {
  const row = await SavedJob.findOneAndDelete({ student: req.user._id, job: req.params.jobId });
  if (!row) throw ApiError.notFound('Saved job not found');
  res.json({ success: true, data: { message: 'Removed' } });
});

// Public platform statistics (mirrors PHP index.php/about.php/companies.php counters).
const publicStats = asyncHandler(async (req, res) => {
  const [openJobs, companies, students, placed] = await Promise.all([
    Job.countDocuments({ approvalStatus: 'approved', status: 'Open' }),
    CompanyProfile.countDocuments({}),
    User.countDocuments({ role: 'student' }),
    StudentProfile.countDocuments({ placementStatus: 'placed' }),
  ]);
  res.json({ success: true, data: { openJobs, companies, students, placed } });
});

// Public company directory (open to guests, mirrors PHP companies.php which lists
// every company and only shows the verified badge for verified ones).
const listCompaniesPublic = asyncHandler(async (req, res) => {
  const { page, limit, skip } = paginate(req.query);
  const { search, industry } = req.query;
  const filter = {};
  if (search) {
    const rx = new RegExp(escapeRegex(search), 'i');
    filter.$or = [{ companyName: rx }, { description: rx }, { city: rx }];
  }
  if (industry) filter.industry = industry;
  const [items, total, industries] = await Promise.all([
    CompanyProfile.find(filter).select('companyName industry city description logo website verificationStatus createdAt').sort({ companyName: 1 }).skip(skip).limit(limit),
    CompanyProfile.countDocuments(filter),
    CompanyProfile.distinct('industry', { industry: { $nin: [null, ''] } }),
  ]);
  const withCounts = await Promise.all(items.map(async (c) => ({
    company: c,
    approvedJobs: await Job.countDocuments({ company: c._id, approvalStatus: 'approved', status: 'Open' }),
  })));
  res.json({
    success: true,
    data: withCounts,
    pagination: { page, limit, total, pages: Math.max(1, Math.ceil(total / limit)) },
    meta: { industries: (industries || []).filter(Boolean).sort() },
  });
});

module.exports = { listJobs, getJob, jobEligibility, recommended, externalJobs, listSaved, saveJob, unsaveJob, listCompaniesPublic, publicStats };
