const crypto = require('crypto');
const mongoose = require('mongoose');
const { Assessment, AssessmentQuestion, AssessmentAttempt, AssessmentAnswer, ExamViolation } = require('../models/Assessment');
const { Application } = require('../models/Application');
const { Job } = require('../models/Job');
const CompanyProfile = require('../models/CompanyProfile');
const User = require('../models/User');
const { ApiError, asyncHandler, paginate, escapeRegex, omit, PROTECTED_FIELDS } = require('../utils/helpers');
const { notifyUser, notifyTpos } = require('../services/notify.service');
const audit = require('../services/audit.service');
const { buildPdf } = require('../services/pdf.service');

const VIOLATION_TYPES = ['TAB_SWITCH', 'WINDOW_BLUR', 'FULLSCREEN_EXIT', 'FULLSCREEN_DENIED', 'COPY_ATTEMPT', 'PASTE_ATTEMPT', 'CUT_ATTEMPT', 'CONTEXT_MENU', 'MULTIPLE_SESSION', 'NETWORK_INTERRUPTION', 'TIME_EXPIRED', 'SHORTCUT_ATTEMPT', 'PRINTSCREEN_ATTEMPT', 'SAVE_FAIL', 'UNKNOWN'];
const WARN_AT = 1, FLAG_AT = 2, BLOCK_AT = 3;

function seedRand(seed) {
  let h = 2166136261;
  for (let i = 0; i < seed.length; i++) { h ^= seed.charCodeAt(i); h = Math.imul(h, 16777619); }
  return function () { h = Math.imul(h ^ (h >>> 15), 2246822507); h = Math.imul(h ^ (h >>> 13), 3266489909); h ^= h >>> 16; return (h >>> 0) / 4294967296; };
}
function shuffledOptions(attemptId, qid) {
  // Deterministic per attempt+question (parity with PHP mt_srand scheme)
  const rand = seedRand(String(attemptId) + ':' + String(qid));
  const letters = ['A', 'B', 'C', 'D'];
  const order = [...letters];
  for (let i = order.length - 1; i > 0; i--) { const j = Math.floor(rand() * (i + 1));[order[i], order[j]] = [order[j], order[i]]; }
  return order;
}
function displayLetter(order, correct) { return order[order.indexOf(correct)] ? String.fromCharCode(65 + order.indexOf(correct)) : correct; }

async function hasStudentAppliedForAssessment(studentId, assessment) {
  if (!assessment || !studentId) return false;

  // 1. Direct match on assessment.job
  if (assessment.job) {
    const directApp = await Application.findOne({ student: studentId, job: assessment.job });
    if (directApp) return true;
  }

  // 2. Title / role matching across all jobs
  let targetJob = null;
  if (assessment.job) {
    targetJob = await Job.findById(assessment.job).select('title company');
  }

  const queryOr = [];
  if (targetJob?.title) {
    const rx = new RegExp(targetJob.title.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
    queryOr.push({ title: rx });
  }
  if (assessment.title) {
    const cleanTitle = assessment.title
      .replace(/(Competency Test|Architecture Exam|Proficiency Exam|Screening Exam|Screening Test|Core Evaluation|Evaluation|Assessment|Test|Exam)$/i, '')
      .trim();
    if (cleanTitle.length > 3) {
      const rx = new RegExp(cleanTitle.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
      queryOr.push({ title: rx });
    }
  }

  const companyId = assessment.company?._id || assessment.company || targetJob?.company;
  if (companyId) {
    queryOr.push({ company: companyId });
  }

  if (queryOr.length > 0) {
    const matchingJobs = await Job.find({ $or: queryOr }).select('_id');
    const jobIds = matchingJobs.map((j) => j._id);
    if (jobIds.length > 0) {
      const matchApp = await Application.findOne({ student: studentId, job: { $in: jobIds } });
      if (matchApp) return true;
    }
  }

  // 3. Match any job applied at this company
  if (companyId) {
    const companyJobs = await Job.find({ company: companyId }).select('_id');
    const compJobIds = companyJobs.map((j) => j._id);
    if (compJobIds.length > 0) {
      const compApp = await Application.findOne({ student: studentId, job: { $in: compJobIds } });
      if (compApp) return true;
    }
  }

  return false;
}

async function ownCompany(userId) {
  const cp = await CompanyProfile.findOne({ user: userId });
  if (!cp) throw ApiError.badRequest('Company profile not found.');
  return cp;
}

const list = asyncHandler(async (req, res) => {
  const { page, limit, skip } = paginate(req.query);
  let filter = {};
  if (req.user.role === 'student') {
    if (req.query.jobId) {
      filter = { status: 'active', job: req.query.jobId };
    } else {
      filter = { status: 'active' };
    }
  } else if (req.user.role === 'company') {
    const cp = await ownCompany(req.user._id);
    filter = { company: cp._id };
    if (req.query.jobId) filter.job = req.query.jobId;
  } else if (req.query.jobId) {
    filter.job = req.query.jobId;
  }
  if (req.query.status && req.user.role !== 'student') filter.status = req.query.status;
  const [items, total] = await Promise.all([
    Assessment.find(filter).populate('company', 'companyName logo').populate('job', 'title').sort({ createdAt: -1 }).skip(skip).limit(limit),
    Assessment.countDocuments(filter),
  ]);
  const enriched = await Promise.all(items.map(async (a) => {
    const [questionCount, attemptCount] = await Promise.all([
      AssessmentQuestion.countDocuments({ assessment: a._id }),
      AssessmentAttempt.countDocuments({ assessment: a._id }),
    ]);
    const o = a.toObject();
    o.questionCount = questionCount;
    o.attemptCount = attemptCount;
    if (req.user.role === 'student') {
      o.unlocked = await hasStudentAppliedForAssessment(req.user._id, a);
      o.hasApplied = o.unlocked;
    }
    return o;
  }));

  // Deduplicate assessments by title and company name for clean student rendering
  const seen = new Map();
  for (const item of enriched) {
    const key = `${item.title}::${item.company?.companyName || item.company?._id || item.company}`;
    if (!seen.has(key)) {
      seen.set(key, item);
    } else if (item.unlocked && !seen.get(key).unlocked) {
      seen.set(key, item);
    }
  }
  const deduped = Array.from(seen.values());
  if (req.user.role === 'student') {
    deduped.sort((a, b) => (b.unlocked ? 1 : 0) - (a.unlocked ? 1 : 0));
  }

  res.json({ success: true, data: deduped, pagination: { page, limit, total: deduped.length, pages: Math.max(1, Math.ceil(deduped.length / limit)) } });
});

const create = asyncHandler(async (req, res) => {
  const cp = await ownCompany(req.user._id);
  const job = await Job.findOne({ _id: req.body.job, company: cp._id }).select('_id');
  if (!job) throw ApiError.badRequest('Choose a job owned by your company.');
  const a = await Assessment.create({ ...omit(req.body, PROTECTED_FIELDS), company: cp._id, status: 'draft' });
  res.status(201).json({ success: true, data: a });
});

const update = asyncHandler(async (req, res) => {
  const cp = await ownCompany(req.user._id);
  const a = await Assessment.findOne({ _id: req.params.id, company: cp._id });
  if (!a) throw ApiError.notFound('Assessment not found');
  if (req.body.job !== undefined) {
    const job = await Job.findOne({ _id: req.body.job, company: cp._id }).select('_id');
    if (!job) throw ApiError.badRequest('Choose a job owned by your company.');
  }
  const configFields = ['job', 'title', 'description', 'durationMinutes', 'totalMarks', 'numQuestions', 'marksPerQuestion', 'passingPercentage', 'difficulty', 'categories', 'technology', 'negativeMarking', 'negativeMarks'];
  const structural = configFields.some((k) => req.body[k] !== undefined && String(req.body[k]) !== String(a[k] ?? ''));
  Object.assign(a, omit(req.body, [...PROTECTED_FIELDS, 'status']));
  if (structural && a.status === 'active') a.status = 'draft'; // parity: edits unpublish
  await a.save();
  res.json({ success: true, data: a });
});

const remove = asyncHandler(async (req, res) => {
  const cp = await ownCompany(req.user._id);
  const a = await Assessment.findOne({ _id: req.params.id, company: cp._id });
  if (!a) throw ApiError.notFound('Assessment not found');
  if (a.status === 'active') throw ApiError.badRequest('Unpublish an active assessment before deleting.');
  await AssessmentQuestion.deleteMany({ assessment: a._id });
  await a.deleteOne();
  res.json({ success: true, data: { message: 'Deleted' } });
});

const publish = asyncHandler(async (req, res) => {
  const cp = await ownCompany(req.user._id);
  const a = await Assessment.findOne({ _id: req.params.id, company: cp._id });
  if (!a) throw ApiError.notFound('Assessment not found');
  const count = await AssessmentQuestion.countDocuments({ assessment: a._id });
  if (!count) throw ApiError.conflict('This assessment is not ready yet.');
  a.status = 'active'; await a.save();
  if (a.job) {
    const apps = await Application.find({ job: a.job }).select('student');
    for (const ap of apps) await notifyUser(ap.student, 'Assessment assigned', `${a.title} is assigned.`, { type: 'assessment', referenceId: a._id, priority: 'high', actionUrl: '/student/assessments', dedupe: true });
  }
  res.json({ success: true, data: a });
});

const unpublish = asyncHandler(async (req, res) => {
  const cp = await ownCompany(req.user._id);
  const a = await Assessment.findOne({ _id: req.params.id, company: cp._id });
  if (!a) throw ApiError.notFound('Assessment not found');
  if (a.status !== 'active') throw ApiError.conflict('This assessment is not currently published.');
  a.status = 'draft';
  await a.save();
  res.json({ success: true, data: a });
});

const listQuestions = asyncHandler(async (req, res) => {
  const a = await Assessment.findById(req.params.id);
  if (!a) throw ApiError.notFound('Assessment not found');
  if (req.user.role === 'company') {
    const cp = await CompanyProfile.findOne({ user: req.user._id });
    if (!cp || String(a.company) !== String(cp._id)) throw ApiError.forbidden('Access denied');
  }
  const qs = await AssessmentQuestion.find({ assessment: a._id }).sort({ _id: 1 });
  if (req.user.role === 'student') return res.json({ success: true, data: qs.map((q) => ({ _id: q._id, question: q.question, questionType: q.questionType, options: { A: q.optionA, B: q.optionB, C: q.optionC, D: q.optionD }, marks: q.marks })) });
  res.json({ success: true, data: qs });
});
const addQuestion = asyncHandler(async (req, res) => {
  const cp = await ownCompany(req.user._id);
  const a = await Assessment.findOne({ _id: req.params.id, company: cp._id });
  if (!a) throw ApiError.notFound('Assessment not found');
  const dup = await AssessmentQuestion.findOne({ assessment: a._id, question: new RegExp('^' + req.body.question.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '$', 'i') });
  if (dup) throw ApiError.conflict('Duplicate question.');
  const q = await AssessmentQuestion.create({ ...omit(req.body, PROTECTED_FIELDS), assessment: a._id });
  if (a.status === 'active') { a.status = 'draft'; await a.save(); }
  res.status(201).json({ success: true, data: q });
});
const patchQuestion = asyncHandler(async (req, res) => {
  const cp = await ownCompany(req.user._id);
  const a = await Assessment.findOne({ _id: req.params.id, company: cp._id });
  if (!a) throw ApiError.notFound('Assessment not found');
  const q = await AssessmentQuestion.findOne({ _id: req.params.qid, assessment: a._id });
  if (!q) throw ApiError.notFound('Question not found');
  Object.assign(q, omit(req.body, [...PROTECTED_FIELDS, 'assessment'])); await q.save();
  if (a.status === 'active') { a.status = 'draft'; await a.save(); }
  res.json({ success: true, data: q });
});
const deleteQuestion = asyncHandler(async (req, res) => {
  const cp = await ownCompany(req.user._id);
  const a = await Assessment.findOne({ _id: req.params.id, company: cp._id });
  if (!a) throw ApiError.notFound('Assessment not found');
  await AssessmentQuestion.findOneAndDelete({ _id: req.params.qid, assessment: a._id });
  if (a.status === 'active') { a.status = 'draft'; await a.save(); }
  res.json({ success: true, data: { message: 'Deleted' } });
});

const regenerateQuestion = asyncHandler(async (req, res) => {
  const cp = await ownCompany(req.user._id);
  const a = await Assessment.findOne({ _id: req.params.id, company: cp._id }).populate('job', 'title');
  if (!a) throw ApiError.notFound('Assessment not found');
  const q = await AssessmentQuestion.findOne({ _id: req.params.qid, assessment: a._id });
  if (!q) throw ApiError.notFound('Question not found');

  const category = GEN_CATEGORIES.includes(req.body.category) ? req.body.category : (GEN_CATEGORIES.includes(a.categories) ? a.categories : 'Technical');
  const topic = String(req.body.topic ?? a.technology ?? '').trim();
  const difficulty = ['Easy', 'Medium', 'Hard', 'Mixed'].includes(req.body.difficulty) ? req.body.difficulty : (a.difficulty || 'Medium');
  const ai = await aiQuestions({ title: a.title, jobTitle: a.job?.title, category, topic, difficulty, count: 1, excludeQuestion: q.question });
  if (!ai?.items?.length) throw new ApiError(503, 'AI question generation is not configured. Add a valid provider key and model, then retry.');
  const used = new Set((await AssessmentQuestion.find({ assessment: a._id, _id: { $ne: q._id } }).select('question')).map((item) => String(item.question).toLowerCase().trim()));
  let replacement = null;
  for (const item of ai.items) {
    const stem = String(item?.question ?? item?.question_text ?? item?.prompt ?? '').trim();
    const opts = aiOptionValues(item);
    const correct = aiCorrectLetter(item, opts);
    if (stem.length < 8 || opts.length !== 4 || opts.some((o) => !o) || new Set(opts.map((o) => o.toLowerCase())).size !== 4 || !['A', 'B', 'C', 'D'].includes(correct)) continue;
    if (used.has(stem.toLowerCase())) continue;
    replacement = { stem, opts, correct };
    break;
  }
  if (!replacement) throw new ApiError(502, 'AI did not return a valid, new question. Your existing question was kept unchanged; please retry.');

  q.question = replacement.stem;
  q.questionType = category === 'Technical' || category === 'Programming' ? 'Technical' : category === 'Aptitude' ? 'Aptitude' : category === 'Logical Reasoning' ? 'Logical Reasoning' : 'MCQ';
  [q.optionA, q.optionB, q.optionC, q.optionD] = replacement.opts;
  q.correctAnswer = replacement.correct;
  await q.save();
  if (a.status === 'active') { a.status = 'draft'; await a.save(); }
  audit('question_regenerate', 'assessments', `Regenerated a question for "${a.title}" using ${ai.model || ai.provider}`, req.user._id, req);
  res.json({ success: true, data: { question: q, model: ai.model || null } });
});

const start = asyncHandler(async (req, res) => {
  const a = await Assessment.findById(req.params.id);
  if (!a || a.status !== 'active') throw ApiError.conflict('This assessment is not ready yet.');
  const qcount = await AssessmentQuestion.countDocuments({ assessment: a._id });
  if (!qcount) throw ApiError.conflict('This assessment is not ready yet.');
  if (a.job) {
    const has = await hasStudentAppliedForAssessment(req.user._id, a);
    if (!has) throw ApiError.forbidden('You are not eligible for this assessment yet. Apply for the linked job first.');
  }
  const done = await AssessmentAttempt.findOne({ assessment: a._id, student: req.user._id, status: 'submitted' });
  if (done) throw ApiError.conflict('Assessment already submitted.');
  let attempt = await AssessmentAttempt.findOne({ assessment: a._id, student: req.user._id, status: 'active' });
  const sessionId = req.body.sessionId || crypto.randomBytes(32).toString('hex');
  if (attempt) {
    if (attempt.sessionId && attempt.sessionId !== sessionId) {
      await recordViolation(attempt, req.user._id, 'MULTIPLE_SESSION', 'Concurrent session on same attempt detected', 'HIGH', req);
      throw ApiError.conflict('This assessment is already active in another session.');
    }
    if (attempt.expiresAt && attempt.expiresAt < new Date()) {
      await evaluateAndSubmit(attempt._id);
      throw ApiError.gone('Time expired. Your assessment was auto-submitted.');
    }
  } else {
    const questions = await AssessmentQuestion.find({ assessment: a._id }).select('_id');
    const questionOrder = questions.map((q) => String(q._id));
    for (let i = questionOrder.length - 1; i > 0; i--) {
      const j = crypto.randomInt(i + 1);
      [questionOrder[i], questionOrder[j]] = [questionOrder[j], questionOrder[i]];
    }
    attempt = await AssessmentAttempt.create({
      assessment: a._id, student: req.user._id, sessionId,
      expiresAt: new Date(Date.now() + a.durationMinutes * 60000),
      questionOrder, status: 'active',
    });
  }
  const questions = await AssessmentQuestion.find({ assessment: a._id });
  const order = attempt.questionOrder?.length ? attempt.questionOrder : questions.map((q) => String(q._id));
  const byId = new Map(questions.map((q) => [String(q._id), q]));
  const paper = order.filter((id) => byId.has(id)).map((id) => {
    const q = byId.get(id);
    const disp = shuffledOptions(attempt._id, id);
    const opts = { A: q.optionA, B: q.optionB, C: q.optionC, D: q.optionD };
    const shown = {};
    disp.forEach((orig, i) => { shown[String.fromCharCode(65 + i)] = opts[orig]; });
    return { _id: q._id, question: q.question, questionType: q.questionType, options: shown, marks: q.marks };
  });
  const answers = await AssessmentAnswer.find({ attempt: attempt._id });
  res.json({ success: true, data: { attemptId: attempt._id, title: a.title, durationMinutes: a.durationMinutes, expiresAt: attempt.expiresAt, sessionId: attempt.sessionId, violationCount: attempt.violationCount || 0, integrityStatus: attempt.integrityStatus || 'NORMAL', questions: paper, answers: answers.map((x) => ({ question: x.question, selected: x.selectedAnswer })) } });
});

async function recordViolation(attempt, studentId, type, description, severity, req) {
  await ExamViolation.create({ attempt: attempt._id, student: studentId, violationType: type, description, severity, metadata: req?.body?.metadata || null });
  const upd = await AssessmentAttempt.findById(attempt._id);
  if (!upd || upd.status !== 'active') return upd;
  upd.violationCount += 1;
  if (upd.violationCount >= FLAG_AT && upd.integrityStatus === 'NORMAL') upd.integrityStatus = 'FLAGGED';
  await upd.save();
  if (upd.violationCount >= BLOCK_AT) {
    await evaluateAndSubmit(upd._id);
    return AssessmentAttempt.findByIdAndUpdate(upd._id, { integrityStatus: 'BLOCKED' }, { new: true });
  }
  return upd;
}

async function evaluateAndSubmit(attemptId) {
  const attempt = await AssessmentAttempt.findById(attemptId);
  if (!attempt || attempt.status !== 'active') return attempt;
  const a = await Assessment.findById(attempt.assessment);
  const questions = await AssessmentQuestion.find({ assessment: attempt.assessment });
  const answers = await AssessmentAnswer.find({ attempt: attempt._id });
  const ansMap = new Map(answers.map((x) => [String(x.question), x]));
  let score = 0, max = 0, correct = 0;
  for (const q of questions) {
    max += q.marks || 0;
    const ans = ansMap.get(String(q._id));
    const sel = ans?.selectedAnswer || null;
    const order = shuffledOptions(attempt._id, q._id);
    // selected letter refers to DISPLAY position; map back to original
    let origSel = null;
    if (sel) { const idx = sel.charCodeAt(0) - 65; origSel = order[idx] || null; }
    const hit = origSel && origSel === q.correctAnswer;
    let marks = 0;
    if (hit) { marks = q.marks; correct += 1; }
    else if (origSel && a.negativeMarking) marks = -(a.negativeMarks || 0);
    score += marks;
    if (ans) { ans.isCorrect = !!hit; ans.marksObtained = marks; await ans.save(); }
  }
  if (score < 0) score = 0;
  const perc = max ? Math.round((score * 100 / max) * 100) / 100 : 0;
  attempt.score = score; attempt.percentage = perc;
  attempt.result = perc >= (a.passingPercentage ?? 60) ? 'Passed' : 'Failed';
  attempt.submittedAt = new Date(); attempt.status = 'submitted'; attempt.integrityStatus = 'SUBMITTED';
  await attempt.save();
  // Notify company + TPOs (parity with PHP exam_evaluate_and_submit)
  const comp = await CompanyProfile.findById(a.company);
  if (comp) await notifyUser(comp.user, 'Assessment submitted', `${a.title} — a student submitted the assessment.`, { type: 'assessment', referenceId: attempt._id, actionUrl: '/company/assessments', dedupe: true });
  await notifyTpos('Assessment submitted', `${a.title} was submitted by a student.`, { type: 'assessment', referenceId: attempt._id, priority: 'low' });
  // Progress linked application status upon passing
  try {
    const query = a.job ? { student: attempt.student, job: a.job } : { student: attempt.student };
    let app = await Application.findOne(query);
    if (!app && a.company) {
      const companyJobIds = (await Job.find({ company: a.company }).select('_id')).map((j) => j._id);
      app = await Application.findOne({ student: attempt.student, job: { $in: companyJobIds } });
    }
    if (app && ['Applied', 'Under Review'].includes(app.status)) {
      app.status = perc >= (a.passingPercentage ?? 60) ? 'Interview' : 'Assessment';
      app.history.push({ status: app.status, note: `Online Assessment ${attempt.result} (${perc}%)` });
      await app.save();
    }
  } catch (appErr) {
    console.warn('[assessment:app-update:warn]', appErr.message);
  }
  return attempt;
}

const saveAnswer = asyncHandler(async (req, res) => {
  const { questionId, selected } = req.body;
  if (selected !== null && !['A', 'B', 'C', 'D'].includes(selected)) throw ApiError.badRequest('Invalid answer.');
  const attempt = await AssessmentAttempt.findOne({ _id: req.params.id, student: req.user._id, status: 'active' });
  if (!attempt) throw ApiError.notFound('Active attempt not found');
  if (attempt.expiresAt && attempt.expiresAt < new Date()) { await evaluateAndSubmit(attempt._id); throw ApiError.gone('Time expired. Auto-submitted.'); }
  await AssessmentAnswer.findOneAndUpdate({ attempt: attempt._id, question: questionId }, { selectedAnswer: selected }, { upsert: true });
  attempt.lastActivityAt = new Date(); await attempt.save();
  res.json({ success: true, data: { saved: true } });
});
const heartbeat = asyncHandler(async (req, res) => {
  const attempt = await AssessmentAttempt.findOne({ _id: req.params.id, student: req.user._id, status: 'active' });
  if (!attempt) throw ApiError.notFound('Active attempt not found');
  attempt.lastHeartbeatAt = new Date(); attempt.lastActivityAt = new Date(); await attempt.save();
  res.json({ success: true, data: { ok: true } });
});
const violation = asyncHandler(async (req, res) => {
  const { type, description, metadata } = req.body;
  if (!VIOLATION_TYPES.includes(type)) throw ApiError.badRequest('Invalid violation type.');
  const attempt = await AssessmentAttempt.findOne({ _id: req.params.id, student: req.user._id, status: 'active' });
  if (!attempt) throw ApiError.notFound('Active attempt not found');
  const upd = await recordViolation(attempt, req.user._id, type, description || '', type === 'MULTIPLE_SESSION' ? 'HIGH' : 'LOW', req);
  res.json({ success: true, data: { violationCount: upd.violationCount, integrityStatus: upd.integrityStatus, blocked: upd.integrityStatus === 'BLOCKED' } });
});
const submit = asyncHandler(async (req, res) => {
  const attempt = await AssessmentAttempt.findOne({ _id: req.params.id, student: req.user._id, status: 'active' });
  if (!attempt) throw ApiError.notFound('Active attempt not found');
  const done = await evaluateAndSubmit(attempt._id);
  res.json({ success: true, data: { score: done.score, percentage: done.percentage, result: done.result } });
});
const result = asyncHandler(async (req, res) => {
  const attempt = await AssessmentAttempt.findById(req.params.id).populate('assessment').populate('student', 'name email');
  if (!attempt) throw ApiError.notFound('Attempt not found');
  const uid = String(req.user._id);
  const isOwner = String(attempt.student._id || attempt.student) === uid;
  if (req.user.role === 'student' && !isOwner) throw ApiError.forbidden('Access denied');
  if (req.user.role === 'company') {
    const cp = await CompanyProfile.findOne({ user: req.user._id });
    if (!cp || String(attempt.assessment.company) !== String(cp._id)) throw ApiError.forbidden('Access denied');
  }
  if (attempt.status !== 'submitted') throw ApiError.badRequest('Assessment not submitted yet.');
  const storedAnswers = await AssessmentAnswer.find({ attempt: attempt._id }).populate('question');
  const answers = storedAnswers.map((answer) => {
    const row = answer.toObject();
    if (row.question) {
      const optionOrder = shuffledOptions(attempt._id, row.question._id);
      const originalOptions = { A: row.question.optionA, B: row.question.optionB, C: row.question.optionC, D: row.question.optionD };
      row.question.options = Object.fromEntries(optionOrder.map((letter, index) => [String.fromCharCode(65 + index), originalOptions[letter]]));
      row.question.displayCorrectAnswer = displayLetter(optionOrder, row.question.correctAnswer);
    }
    return row;
  });
  res.json({ success: true, data: { attempt, answers } });
});
const myAttempts = asyncHandler(async (req, res) => {
  const attempts = await AssessmentAttempt.find({ student: req.user._id })
    .select('assessment status result score percentage startedAt submittedAt expiresAt sessionId violationCount integrityStatus createdAt')
    .populate('assessment', 'title')
    .sort({ createdAt: -1 });
  res.json({ success: true, data: attempts });
});
const companyResults = asyncHandler(async (req, res) => {
  const cp = await ownCompany(req.user._id);
  const { page, limit, skip } = paginate(req.query, { limit: 15 });
  const owned = await Assessment.find({ company: cp._id }).select('_id');
  const ownedIds = owned.map((item) => item._id);
  const filter = { assessment: { $in: ownedIds } };
  if (req.query.assessmentId) {
    const selected = await Assessment.findOne({ _id: req.query.assessmentId, company: cp._id }).select('_id');
    if (!selected) throw ApiError.notFound('Assessment not found');
    filter.assessment = selected._id;
  }
  const search = String(req.query.q || '').trim();
  if (search) {
    const rx = new RegExp(escapeRegex(search), 'i');
    const [students, titled] = await Promise.all([
      User.find({ role: 'student', $or: [{ name: rx }, { email: rx }] }).select('_id').limit(1000),
      Assessment.find({ company: cp._id, title: rx }).select('_id'),
    ]);
    const or = [];
    if (students.length) or.push({ student: { $in: students.map((student) => student._id) } });
    if (titled.length) or.push({ assessment: { $in: titled.map((assessment) => assessment._id) } });
    if (/^\d+(\.\d+)?$/.test(search)) {
      or.push({ $expr: { $regexMatch: { input: { $toString: '$percentage' }, regex: escapeRegex(search), options: 'i' } } });
    }
    if (!or.length) filter._id = { $exists: false };
    else filter.$or = or;
  }
  const [items, total] = await Promise.all([
    AssessmentAttempt.find(filter).populate('student', 'name email').populate('assessment', 'title totalMarks passingPercentage').sort({ createdAt: -1 }).skip(skip).limit(limit),
    AssessmentAttempt.countDocuments(filter),
  ]);
  res.json({ success: true, data: items, pagination: { page, limit, total, pages: Math.max(1, Math.ceil(total / limit)) } });
});
const attemptMonitor = asyncHandler(async (req, res) => {
  const attempt = await AssessmentAttempt.findById(req.params.id)
    .populate({ path: 'assessment', populate: [{ path: 'company', select: 'companyName' }, { path: 'job', select: 'title' }] })
    .populate('student', 'name email');
  if (!attempt) throw ApiError.notFound('Assessment attempt not found');
  if (req.user.role === 'company') {
    const cp = await CompanyProfile.findOne({ user: req.user._id }).select('_id');
    if (!cp || String(attempt.assessment.company?._id || attempt.assessment.company) !== String(cp._id)) throw ApiError.forbidden('Access denied');
  }
  const violations = await ExamViolation.find({ attempt: attempt._id }).sort({ occurredAt: 1 });
  res.json({ success: true, data: { attempt, violations } });
});
const getOne = asyncHandler(async (req, res) => {
  const a = await Assessment.findById(req.params.id).populate('company', 'companyName logo').populate('job', 'title');
  if (!a) throw ApiError.notFound('Assessment not found');
  if (req.user.role === 'company') {
    const cp = await CompanyProfile.findOne({ user: req.user._id });
    if (!cp || String(a.company?._id || a.company) !== String(cp._id)) throw ApiError.forbidden('Access denied');
  }
  let unlocked = true;
  if (req.user.role === 'student') {
    if (a.status !== 'active') throw ApiError.forbidden('This assessment is not currently available.');
    unlocked = await hasStudentAppliedForAssessment(req.user._id, a);
  }
  const obj = a.toObject();
  obj.unlocked = unlocked;
  res.json({ success: true, data: obj });
});
const results = asyncHandler(async (req, res) => {
  const a = await Assessment.findById(req.params.id);
  if (!a) throw ApiError.notFound('Assessment not found');
  if (req.user.role === 'company') {
    const cp = await CompanyProfile.findOne({ user: req.user._id });
    if (!cp || String(a.company) !== String(cp._id)) throw ApiError.forbidden('Access denied');
  }
  const attempts = await AssessmentAttempt.find({ assessment: a._id }).populate('student', 'name email').sort({ percentage: -1 });
  res.json({ success: true, data: attempts });
});
const violations = asyncHandler(async (req, res) => {
  const a = await Assessment.findById(req.params.id);
  if (!a) throw ApiError.notFound('Assessment not found');
  if (req.user.role === 'company') {
    const cp = await CompanyProfile.findOne({ user: req.user._id });
    if (!cp || String(a.company) !== String(cp._id)) throw ApiError.forbidden('Access denied');
  }
  const attempts = await AssessmentAttempt.find({ assessment: a._id }).select('_id');
  const ids = attempts.map((x) => x._id);
  res.json({ success: true, data: await ExamViolation.find({ attempt: { $in: ids } }).populate('student', 'name email').sort({ occurredAt: -1 }) });
});

const resultPdf = asyncHandler(async (req, res) => {
  const attempt = await AssessmentAttempt.findById(req.params.id).populate('assessment').populate('student', 'name email');
  if (!attempt) throw ApiError.notFound('Attempt not found');
  const uid = String(req.user._id);
  const isOwner = String(attempt.student._id || attempt.student) === uid;
  if (req.user.role === 'student' && !isOwner) throw ApiError.forbidden('Access denied');
  if (req.user.role === 'company') {
    const cp = await CompanyProfile.findOne({ user: req.user._id });
    if (!cp || String(attempt.assessment.company) !== String(cp._id)) throw ApiError.forbidden('Access denied');
  }
  if (attempt.status !== 'submitted') throw ApiError.badRequest('Assessment not submitted yet.');
  const answers = await AssessmentAnswer.find({ attempt: attempt._id }).populate('question');
  const pdf = buildPdf({ title: 'Assessment Result', subtitle: attempt.assessment?.title || '' });
  pdf.heading(attempt.assessment?.title || 'Assessment');
  pdf.keyValues([
    ['Student', attempt.student?.name],
    ['Email', attempt.student?.email],
    ['Score', `${attempt.score} / ${attempt.assessment?.totalMarks ?? ''}`],
    ['Percentage', `${attempt.percentage}%`],
    ['Result', attempt.result],
    ['Integrity', attempt.integrityStatus],
    ['Submitted At', attempt.submittedAt ? new Date(attempt.submittedAt).toISOString().slice(0, 16).replace('T', ' ') : ''],
  ]);
  pdf.subheading('Answers');
  pdf.table(
    [{ key: 'question', label: 'Question', width: 0.5 }, { key: 'selected', label: 'Answer', width: 0.15 }, { key: 'correct', label: 'Correct', width: 0.15 }, { key: 'marks', label: 'Marks', width: 0.2 }],
    answers.map((a) => ({ question: a.question?.question || '', selected: a.selectedAnswer || '-', correct: a.isCorrect ? 'Yes' : 'No', marks: a.marksObtained }))
  );
  const buf = pdf.build();
  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', `attachment; filename="assessment-result-${attempt._id}.pdf"`);
  res.send(buf);
});

/* ---- AI question generation (parity with legacy generate_questions.php).
   Uses GROQ when configured; otherwise falls back to a curated offline
   question bank. Generated questions are deduplicated against existing ones
   and the assessment is moved back to draft, like manual question edits. ---- */
const GEN_CATEGORIES = ['Technical', 'Programming', 'Aptitude', 'Logical Reasoning', 'Mixed'];

const GEN_FOCUS = {
  Technical: (topic) => ({ focus: `Generate technical assessment questions related to: ${topic}`, rule: 'All questions MUST test technical knowledge of the specified technologies/domains (concepts, tools, best practices). Do NOT generate aptitude, logical-reasoning or non-technical questions.', example: 'Which PHP function is used to count the elements in an array?' }),
  Programming: (topic) => ({ focus: `Generate programming questions related to: ${topic}`, rule: 'All questions MUST be programming questions for the specified languages/technologies (syntax, logic, output prediction, debugging, common libraries). Do NOT generate aptitude or generic questions.', example: 'What is the output of echo 2 ** 3; in PHP?' }),
  Aptitude: (topic) => ({ focus: `Generate aptitude questions based on: ${topic}`, rule: 'All questions MUST be aptitude questions (quantitative / verbal / numerical ability) based only on the selected topics. Do NOT generate programming or technical questions.', example: 'A shopkeeper buys an item for Rs. 80 and sells it for Rs. 100. What is the profit percentage?' }),
  'Logical Reasoning': (topic) => ({ focus: `Generate logical reasoning questions based on: ${topic}`, rule: 'All questions MUST be logical reasoning questions (series, coding-decoding, blood relations, syllogisms, puzzles). Do NOT generate programming, technology or aptitude questions.', example: 'Find the next number in the series: 2, 6, 12, 20, 30, ?' }),
  Mixed: (topic) => ({ focus: topic ? `Generate a balanced mix of technical, programming, aptitude and logical reasoning questions, focusing on: ${topic}` : 'Generate a balanced mix of technical, programming, aptitude and logical reasoning questions across common placement topics.', rule: 'Questions MUST form a balanced mix across Technical, Programming, Aptitude and Logical Reasoning categories.', example: 'Which of the following is the binary representation of the decimal number 13?' }),
};

const OFFLINE_BANK = {
  Technical: [
    { q: 'Which HTTP status code means "Not Found"?', o: ['200 OK', '301 Moved', '404 Not Found', '500 Error'], c: 'C' },
    { q: 'Which key uniquely identifies each row in a database table?', o: ['Foreign key', 'Primary key', 'Index', 'View'], c: 'B' },
    { q: 'Which data structure works on the FIFO (First In First Out) principle?', o: ['Stack', 'Queue', 'Tree', 'Graph'], c: 'B' },
    { q: 'Which of the following is NOT a NoSQL database?', o: ['MongoDB', 'Cassandra', 'MySQL', 'Redis'], c: 'C' },
    { q: 'What is the time complexity of binary search on a sorted array?', o: ['O(n)', 'O(log n)', 'O(n log n)', 'O(1)'], c: 'B' },
    { q: 'Which OSI layer is responsible for routing packets?', o: ['Data Link', 'Network', 'Transport', 'Session'], c: 'B' },
    { q: 'In OOP, bundling data together with the methods that operate on it is called?', o: ['Inheritance', 'Polymorphism', 'Encapsulation', 'Abstraction'], c: 'C' },
    { q: 'Which command stages changes for a commit in Git?', o: ['git push', 'git add', 'git merge', 'git clone'], c: 'B' },
  ],
  Programming: [
    { q: 'What is the output of console.log(typeof NaN) in JavaScript?', o: ['"number"', '"NaN"', '"undefined"', '"object"'], c: 'A' },
    { q: 'In Python, what does len([10, 20, 30]) return?', o: ['2', '3', '6', 'Error'], c: 'B' },
    { q: 'Which loop is guaranteed to execute its body at least once?', o: ['for', 'while', 'do-while', 'forEach'], c: 'C' },
    { q: 'What is the output of 7 // 2 in Python?', o: ['3.5', '3', '4', 'Error'], c: 'B' },
    { q: 'Which keyword declares a block-scoped constant in JavaScript?', o: ['var', 'let', 'const', 'static'], c: 'C' },
    { q: 'What does the git clone command do?', o: ['Creates a new branch', 'Copies a remote repository locally', 'Merges two branches', 'Deletes history'], c: 'B' },
    { q: 'Which symbol starts a single-line comment in Python?', o: ['//', '/*', '#', '--'], c: 'C' },
    { q: 'In most programming languages, what is the index of the first array element?', o: ['0', '1', '-1', 'undefined'], c: 'A' },
  ],
  Aptitude: [
    { q: 'A shopkeeper buys an item for Rs. 80 and sells it for Rs. 100. What is the profit percentage?', o: ['20%', '25%', '30%', '15%'], c: 'B' },
    { q: 'What is the average of 10, 20, 30 and 40?', o: ['20', '25', '30', '22.5'], c: 'B' },
    { q: 'If 5 workers complete a task in 10 days, how many days will 10 workers take (same pace)?', o: ['20 days', '10 days', '5 days', '2.5 days'], c: 'C' },
    { q: 'Find the next number in the series: 2, 6, 12, 20, 30, ?', o: ['40', '42', '44', '36'], c: 'B' },
    { q: 'What is 15% of 200?', o: ['25', '30', '35', '20'], c: 'B' },
    { q: 'A train at 60 km/h travels for 2.5 hours. How far does it go?', o: ['120 km', '150 km', '180 km', '100 km'], c: 'B' },
    { q: 'Two parts are in ratio 2:3 and sum to 50. What is the larger part?', o: ['20', '25', '30', '35'], c: 'C' },
    { q: 'What is the simple interest on Rs. 1000 at 5% per annum for 2 years?', o: ['Rs. 50', 'Rs. 100', 'Rs. 150', 'Rs. 200'], c: 'B' },
  ],
  'Logical Reasoning': [
    { q: 'Book is to Reading as Pen is to?', o: ['Writing', 'Drawing', 'Ink', 'Paper'], c: 'A' },
    { q: 'Find the odd one out: Apple, Mango, Banana, Potato', o: ['Apple', 'Mango', 'Banana', 'Potato'], c: 'D' },
    { q: 'If CAT = 24 (C=3, A=1, T=20; sum of positions), what is DOG?', o: ['24', '25', '26', '28'], c: 'C' },
    { q: 'Find the next letter in the series: A, C, F, J, O, ?', o: ['T', 'U', 'V', 'S'], c: 'B' },
    { q: 'Rahul is taller than Amit. Amit is taller than Vikas. Who is the shortest?', o: ['Rahul', 'Amit', 'Vikas', "Cannot say"], c: 'C' },
    { q: 'Statements: All pens are books. All books are chairs. Conclusion: All pens are chairs.', o: ['Follows', 'Does not follow', 'Uncertain', 'None of these'], c: 'A' },
    { q: 'If WATER is written as XBUFS (each letter shifted +1), how is FISH written?', o: ['GJTI', 'EHSH', 'FJRI', 'HITL'], c: 'A' },
    { q: 'Statements: Some cats are dogs. All dogs are animals. Conclusion: Some cats are animals.', o: ['Follows', 'Does not follow', 'Uncertain', 'None of these'], c: 'A' },
  ],
};

function qTypeFor(category) {
  if (category === 'Aptitude') return 'Aptitude';
  if (category === 'Logical Reasoning') return 'Logical Reasoning';
  return 'Technical';
}

/* ---- Procedural generators: keep the offline fallback inexhaustible so the
   "Generate with AI" action never dead-ends when no AI key is configured. ---- */
function ri(min, max) { return Math.floor(Math.random() * (max - min + 1)) + min; }
function pickOne(arr) { return arr[Math.floor(Math.random() * arr.length)]; }
function shiftWord(w, s) { return w.split('').map((ch) => String.fromCharCode(65 + ((((ch.charCodeAt(0) - 65 + s) % 26) + 26) % 26))).join(''); }
function makeOptions(correct, candidates) {
  const c = String(correct);
  const opts = [c];
  for (const cand of candidates) { const s = String(cand); if (s && !opts.includes(s)) opts.push(s); if (opts.length === 4) break; }
  let n = 0;
  while (opts.length < 4) { n += 1; const s = `${c} (${n})`; if (!opts.includes(s)) opts.push(s); }
  for (let i = opts.length - 1; i > 0; i--) { const j = ri(0, i); [opts[i], opts[j]] = [opts[j], opts[i]]; }
  return { o: opts, c: String.fromCharCode(65 + opts.indexOf(c)) };
}

function gPercent() { const base = ri(2, 20) * 10; const pct = ri(5, 40); const ans = (base * pct) / 100; return { q: `What is ${pct}% of ${base}?`, ...makeOptions(ans, [ans + 2, Math.max(1, ans - 2), ans + pct, base - ans]) }; }
function gProfit() { const cp = ri(2, 20) * 10; const p = ri(5, 40); const sp = Math.round(cp * (1 + p / 100)); return { q: `An item bought for Rs. ${cp} is sold for Rs. ${sp}. What is the profit percentage?`, ...makeOptions(`${p}%`, [`${p + 5}%`, `${Math.max(1, p - 5)}%`, `${p + 10}%`, `${cp}%`]) }; }
function gAverage() { const nums = Array.from({ length: 4 }, () => ri(5, 40)); const sum = nums.reduce((a, b) => a + b, 0); const avg = Math.round((sum / 4) * 100) / 100; return { q: `What is the average of ${nums.join(', ')}?`, ...makeOptions(avg, [avg + 1, Math.max(1, avg - 1), Math.round((sum / 2) * 100) / 100]) }; }
function gSimpleInterest() { const p = ri(1, 10) * 1000; const r = ri(2, 10); const t = ri(1, 5); const si = (p * r * t) / 100; return { q: `What is the simple interest on Rs. ${p} at ${r}% per annum for ${t} years?`, ...makeOptions(`Rs. ${si}`, [`Rs. ${Math.round(si * 1.5)}`, `Rs. ${si + 100}`, `Rs. ${Math.max(1, si - 100)}`]) }; }
function gSpeed() { const speed = ri(3, 12) * 10; const t = ri(1, 6); const dist = speed * t; return { q: `A vehicle travels at ${speed} km/h for ${t} hours. What distance does it cover?`, ...makeOptions(`${dist} km`, [`${dist + 20} km`, `${Math.max(1, dist - 20)} km`, `${speed + t} km`]) }; }
function gRatio() { const a = ri(1, 6); const b = ri(1, 6); const unit = ri(2, 12) * 10; const total = (a + b) * unit; const shareA = unit * a; return { q: `Rs. ${total} is divided between two people in the ratio ${a}:${b}. What is the share of the first person?`, ...makeOptions(`Rs. ${shareA}`, [`Rs. ${unit * b}`, `Rs. ${shareA + 10}`, `Rs. ${Math.max(1, shareA - 10)}`]) }; }
function gWork() { const m = ri(2, 8); const d = ri(3, 15); const n = m + ri(1, 6); const days = Math.round(((m * d) / n) * 100) / 100; return { q: `If ${m} workers complete a task in ${d} days, how many days will ${n} workers take (working at the same pace)?`, ...makeOptions(`${days} days`, [`${m * d} days`, `${d + m} days`, `${Math.round((d * n) / m)} days`]) }; }

function gLetterSeries() { const start = ri(0, 10); const step = ri(1, 3); const seq = [0, 1, 2, 3, 4].map((i) => String.fromCharCode(65 + ((start + i * step) % 26))); const next = String.fromCharCode(65 + ((start + 5 * step) % 26)); return { q: `Find the next letter in the series: ${seq.join(', ')}, ?`, ...makeOptions(next, [String.fromCharCode(65 + ((start + 6 * step) % 26)), String.fromCharCode(65 + ((start + 4 * step) % 26)), String.fromCharCode(65 + ((start + 5 * step + 1) % 26))]) }; }
function gNumberSeries() { const start = ri(1, 9); const step = ri(2, 9); const seq = [0, 1, 2, 3].map((i) => start + i * step); const next = start + 4 * step; return { q: `Find the next number in the series: ${seq.join(', ')}, ?`, ...makeOptions(next, [next + step, next - 1, next + start]) }; }
function gCoding() { const shift = ri(1, 3); const w1 = 'CAT'; const w2 = 'DOG'; const ans = shiftWord(w2, shift); return { q: `If ${w1} is coded as ${shiftWord(w1, shift)} (each letter shifted by +${shift}), how is ${w2} coded using the same rule?`, ...makeOptions(ans, [shiftWord(w2, shift + 1), shiftWord(w2, shift - 1), w2.split('').reverse().join('')]) }; }
function gOddOne() { const groups = [['Apple', 'Mango', 'Banana', 'Potato'], ['Rose', 'Lily', 'Tulip', 'Mango'], ['Circle', 'Square', 'Triangle', 'Cube'], ['Sparrow', 'Crow', 'Parrot', 'Lion'], ['Copper', 'Iron', 'Gold', 'Plastic']]; const g = pickOne(groups); return { q: `Find the odd one out: ${g.join(', ')}`, ...makeOptions(g[3], [g[0], g[1], g[2]]) }; }

const APT_GENERATORS = [gPercent, gProfit, gAverage, gSimpleInterest, gSpeed, gRatio, gWork];
const LOGIC_GENERATORS = [gLetterSeries, gNumberSeries, gCoding, gOddOne];

function aiOptionValues(item) {
  const suppliedOptions = item?.options ?? item?.choices;
  const fromArray = Array.isArray(suppliedOptions) ? suppliedOptions.map((option) => (
    typeof option === 'object' && option !== null
      ? option.text ?? option.value ?? option.answer ?? ''
      : option
  )) : null;
  const fromObject = suppliedOptions && typeof suppliedOptions === 'object' ? [
    suppliedOptions.A ?? suppliedOptions.a,
    suppliedOptions.B ?? suppliedOptions.b,
    suppliedOptions.C ?? suppliedOptions.c,
    suppliedOptions.D ?? suppliedOptions.d,
  ] : null;
  const values = fromArray || fromObject || [
    item?.A ?? item?.a ?? item?.option_a ?? item?.optionA,
    item?.B ?? item?.b ?? item?.option_b ?? item?.optionB,
    item?.C ?? item?.c ?? item?.option_c ?? item?.optionC,
    item?.D ?? item?.d ?? item?.option_d ?? item?.optionD,
  ];
  return values.slice(0, 4).map((value) => String(value ?? '').trim());
}

function aiCorrectLetter(item, options) {
  const raw = String(item?.correct ?? item?.correct_answer ?? item?.correctAnswer ?? item?.correct_option ?? item?.correctOption ?? item?.answer ?? item?.answer_key ?? '').trim();
  const letter = raw.match(/^(?:option\s*)?([A-D])(?:\b|[).:-])/i);
  if (letter) return letter[1].toUpperCase();
  const textIndex = options.findIndex((option) => option.toLowerCase() === raw.toLowerCase());
  return textIndex >= 0 ? String.fromCharCode(65 + textIndex) : '';
}

async function aiQuestions({ title, jobTitle, category, topic, difficulty, count, excludeQuestion }) {
  const e = require('../config/env');
  let baseUrl = ''; let apiKey = ''; let model = ''; let provider = 'offline';
  if (e.AI_BASE_URL && e.AI_API_KEY) {
    baseUrl = String(e.AI_BASE_URL).replace(/\/$/, ''); apiKey = e.AI_API_KEY; model = e.AI_MODEL || 'gpt-4o-mini'; provider = e.AI_PROVIDER || 'openai';
  } else if (e.GROQ_API_KEY) {
    baseUrl = 'https://api.groq.com/openai/v1'; apiKey = e.GROQ_API_KEY; model = e.GROQ_MODEL; provider = 'groq';
  } else {
    return { items: null, provider: 'offline' };
  }
  const meta = GEN_FOCUS[category](topic || 'general placement topics');
  const topicRule = topic && category === 'Mixed'
    ? `Create the requested balanced mix. Ground technical and programming questions in "${topic}"; keep aptitude and logical reasoning questions relevant to placements.`
    : topic
      ? `Every question and answer option must be directly about "${topic}". Do not substitute generic placement questions or examples from another language/domain.`
      : excludeQuestion
        ? 'Infer the subject and technology from the existing question below. Generate a new question on that same specific subject, preserving its category and difficulty; do not switch to generic placement topics.'
        : 'Cover common college placement topics appropriate to the selected categories.';
  const prompt = `You are an expert assessment designer for a college placement platform. Generate ${count} high-quality, placement-ready MCQ questions.\n`
    + `Assessment: ${title}\n${jobTitle ? `Job context: ${jobTitle}\n` : ''}Category: ${category}\nFocus: ${meta.focus}\nRule: ${meta.rule}\nDifficulty: ${difficulty}\n`
    + `${topicRule}\n`
    + (excludeQuestion ? `Replace this existing question with a genuinely different one. Do not repeat or paraphrase it: ${excludeQuestion}\n` : '')
    + `\n`
    + `Return one JSON object with a "questions" array. Each item must use exactly these fields: question, option_a, option_b, option_c, option_d, correct_answer. The correct_answer value must be exactly one letter: A, B, C, or D. Example shape: {"questions":[{"question":"...","option_a":"...","option_b":"...","option_c":"...","option_d":"...","correct_answer":"B"}]}\n`
    + `Every option must be non-empty, options must be distinct, and exactly one option must be correct.`;
  const sendCompletion = (requestedModel) => fetch(`${baseUrl}/chat/completions`, {
    method: 'POST',
    signal: AbortSignal.timeout(60000),
    headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + apiKey },
    body: JSON.stringify({
      model: requestedModel, temperature: 0.3, max_tokens: Math.min(8000, 600 + count * 380),
      response_format: { type: 'json_object' },
      ...(provider === 'groq' && /^qwen\/qwen3/i.test(requestedModel) ? { reasoning_effort: 'none' } : {}),
      messages: [
        { role: 'system', content: 'You are a precise assessment question generator. Follow the requested topic and output valid JSON only, using the exact field names requested.' },
        { role: 'user', content: prompt },
      ],
    }),
  });
  let r;
  try {
    r = await sendCompletion(model);
  } catch (error) {
    const reason = error.name === 'TimeoutError' ? 'The AI provider took too long to respond.' : 'The AI provider could not be reached.';
    throw new ApiError(502, `${reason} Check the backend network and AI provider settings, then retry.`);
  }
  // Groq accounts can expose different model sets. If the configured model
  // returns 404, discover models enabled for this key and retry once with one
  // of the supported JSON-capable chat models.
  if (r.status === 404 && provider === 'groq') {
    try {
      const modelResponse = await fetch(`${baseUrl}/models`, {
        signal: AbortSignal.timeout(15000),
        headers: { Authorization: 'Bearer ' + apiKey },
      });
      if (modelResponse.ok) {
        const modelData = await modelResponse.json();
        const available = new Set((modelData.data || []).map((entry) => entry.id));
        const alternatives = ['qwen/qwen3.8-27b', 'openai/gpt-oss-20b', 'llama-3.3-70b-versatile', 'llama-3.1-8b-instant'];
        const replacement = alternatives.find((candidate) => candidate !== model && available.has(candidate));
        if (replacement) {
          const retry = await sendCompletion(replacement);
          if (retry.ok) { model = replacement; r = retry; }
          else r = retry;
        }
      }
    } catch { /* Keep the original 404 diagnosis if model discovery fails. */ }
  }
  if (!r.ok) {
    const messages = {
      401: 'The AI provider rejected the configured API key. Check GROQ_API_KEY / AI_API_KEY in backend/.env.',
      403: 'The AI provider denied this request. Check the API key permissions and account access.',
      404: `Groq could not use model "${model}" and no accessible fallback was found. Check the Groq key's model access and GROQ_MODEL.`,
      429: 'The AI provider rate limit or quota was reached. Wait a moment or check the provider account quota.',
    };
    throw new ApiError(502, messages[r.status] || `The AI provider returned HTTP ${r.status}. Check the backend provider configuration and retry.`);
  }
  let data;
  try { data = await r.json(); } catch { throw new ApiError(502, 'The AI provider returned an unreadable response. Please retry.'); }
  const content = data.choices?.[0]?.message?.content || '';
  let parsed;
  try { parsed = JSON.parse(content); } catch { throw new ApiError(502, 'The AI provider response was not valid JSON. Please retry.'); }
  const items = Array.isArray(parsed) ? parsed : parsed.questions;
  if (!Array.isArray(items) || !items.length) throw new ApiError(502, 'The AI provider returned no questions. Please retry.');
  return { items, provider, model };
}

const generate = asyncHandler(async (req, res) => {
  const cp = await ownCompany(req.user._id);
  const a = await Assessment.findOne({ _id: req.params.id, company: cp._id }).populate('job', 'title');
  if (!a) throw ApiError.notFound('Assessment not found');
  const count = Math.max(1, Math.min(20, parseInt(req.body.count, 10) || Math.min(a.numQuestions || 10, 10)));
  const category = GEN_CATEGORIES.includes(req.body.category) ? req.body.category : (GEN_CATEGORIES.includes(a.categories) ? a.categories : 'Technical');
  const topic = String(req.body.topic ?? a.technology ?? '').trim();
  const difficulty = ['Easy', 'Medium', 'Hard', 'Mixed'].includes(req.body.difficulty) ? req.body.difficulty : (a.difficulty || 'Medium');
  if (['Technical', 'Programming', 'Aptitude', 'Logical Reasoning'].includes(category) && !topic) {
    throw ApiError.badRequest(`Please set the topic for ${category} assessments before generating questions.`);
  }
  const marks = Math.max(1, Math.floor((a.totalMarks || 100) / Math.max(count, 1)));

  const existing = await AssessmentQuestion.find({ assessment: a._id }).select('question');
  const seen = new Set(existing.map((q) => String(q.question).toLowerCase().trim()));
  const picked = [];
  let live = false;
  let invalidItems = 0;
  let duplicateItems = 0;

  const ai = await aiQuestions({ title: a.title, jobTitle: a.job?.title, category, topic, difficulty, count });
  if (ai?.items?.length) {
    for (const item of ai.items) {
      if (picked.length >= count) break;
      const stem = String(item?.question ?? item?.question_text ?? item?.prompt ?? '').trim();
      const opts = aiOptionValues(item);
      const correct = aiCorrectLetter(item, opts);
      if (stem.length < 8 || opts.length !== 4 || opts.some((o) => !o) || new Set(opts.map((o) => o.toLowerCase())).size !== 4 || !['A', 'B', 'C', 'D'].includes(correct)) { invalidItems += 1; continue; }
      const key = stem.toLowerCase();
      if (seen.has(key)) { duplicateItems += 1; continue; }
      seen.add(key);
      picked.push({ assessment: a._id, question: stem, questionType: category === 'Technical' || category === 'Programming' ? 'Technical' : category === 'Aptitude' ? 'Aptitude' : category === 'Logical Reasoning' ? 'Logical Reasoning' : 'MCQ', optionA: opts[0], optionB: opts[1], optionC: opts[2], optionD: opts[3], correctAnswer: correct, marks });
    }
    live = picked.length > 0;
    if (!live) {
      const reason = duplicateItems && !invalidItems ? 'all returned questions already exist in this assessment' : 'the returned question fields did not match a valid MCQ format';
      throw new ApiError(502, `AI returned ${ai.items.length} question(s), but ${reason}. Retry generation or adjust the topic.`);
    }
  }

  if (!ai && !picked.length) {
    const banks = category === 'Mixed'
      ? ['Technical', 'Programming', 'Aptitude', 'Logical Reasoning']
      : [category];
    const pool = [];
    banks.forEach((b, bi) => (OFFLINE_BANK[b] || []).forEach((t, ti) => pool.push({ ...t, type: b, ord: ti * banks.length + bi })));
    pool.sort((x, y) => x.ord - y.ord);
    const startAt = existing.length % Math.max(pool.length, 1);
    for (let i = 0; i < pool.length && picked.length < count; i++) {
      const t = pool[(startAt + i) % pool.length];
      const key = t.q.toLowerCase();
      if (seen.has(key)) continue;
      seen.add(key);
      picked.push({ assessment: a._id, question: t.q, questionType: t.type === 'Technical' || t.type === 'Programming' ? 'Technical' : t.type, optionA: t.o[0], optionB: t.o[1], optionC: t.o[2], optionD: t.o[3], correctAnswer: t.c, marks });
    }
  }

  if (!picked.length) throw ApiError.conflict('No new questions could be generated — they already exist.');
  const docs = await AssessmentQuestion.insertMany(picked);
  a.categories = category;
  a.difficulty = difficulty;
  if (topic) a.technology = topic;
  if (a.status === 'active') a.status = 'draft';
  await a.save();
  audit('questions_generate', 'assessments', `Generated ${docs.length} ${live ? 'AI' : 'offline-bank'} questions for "${a.title}"`, req.user._id, req);
  res.status(201).json({ success: true, data: { inserted: docs.length, requested: count, live, model: ai?.model || null, questions: docs } });
});

module.exports = { list, create, update, remove, publish, unpublish, listQuestions, addQuestion, patchQuestion, deleteQuestion, regenerateQuestion, generate, start, saveAnswer, heartbeat, violation, submit, result, myAttempts, companyResults, attemptMonitor, resultPdf, results, violations, evaluateAndSubmit, getOne };
