/** SQL-dump → MongoDB migration (no MySQL server needed).
 * Usage:
 *   node scripts/migrate-mysql-to-mongodb.js --sql "<path-to-dump.sql>" --mongo <uri> [--dry-run] [--fresh]
 * Parses INSERT INTO tuples directly from the dump, remaps FKs via legacyId maps,
 * upserts idempotently. Legacy mirror tables (jobs/applications/...) are counted, not imported.
 */
const fs = require('fs');
const path = require('path');
const mongoose = require('mongoose');

const args = Object.fromEntries(process.argv.slice(2).reduce((acc, a, i, arr) => {
  if (a.startsWith('--')) acc.push([a.slice(2), arr[i + 1]?.startsWith('--') || arr[i + 1] === undefined ? true : arr[i + 1]]);
  return acc;
}, []));
const DRY = args['dry-run'] !== undefined && args['dry-run'] !== 'false';
const FRESH = args.fresh !== undefined && args.fresh !== 'false';
const SQL_PATH = args.sql || 'C:\\Users\\DEV PATEL\\Downloads\\careerconnect (1).sql';
const MONGO = args.mongo || process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/careerconnect';

/** Split a VALUES (...),(...) block into row strings, respecting quotes. */
function splitRows(valuesBlock) {
  const rows = [];
  let depth = 0, cur = '', inStr = false, strCh = '';
  for (let i = 0; i < valuesBlock.length; i++) {
    const ch = valuesBlock[i];
    if (inStr) {
      cur += ch;
      if (ch === strCh && valuesBlock[i - 1] !== '\\') {
        if (valuesBlock[i + 1] === strCh) { cur += valuesBlock[i + 1]; i++; } // '' escape
        else inStr = false;
      }
      continue;
    }
    if (ch === "'" || ch === '"') { inStr = true; strCh = ch; cur += ch; continue; }
    if (ch === '(') { depth++; cur += ch; continue; }
    if (ch === ')') { depth--; cur += ch; if (depth === 0) { rows.push(cur); cur = ''; } continue; }
    cur += ch;
  }
  return rows.filter((r) => r.trim().startsWith('('));
}

/** Parse one row tuple into JS values. */
function parseRow(row) {
  const inner = row.trim().replace(/^\((.*)\)$/s, '$1');
  const vals = [];
  let cur = '', inStr = false, strCh = '';
  const push = () => {
    const t = cur.trim();
    if (/^NULL$/i.test(t)) vals.push(null);
    else if (/^'(.*)'$/s.test(t)) vals.push(t.slice(1, -1).replace(/''/g, "'").replace(/\\'/g, "'"));
    else if (/^".*"$/s.test(t)) vals.push(t.slice(1, -1));
    else if (/^[0-9.+-]+$/.test(t)) vals.push(Number(t));
    else vals.push(t);
    cur = '';
  };
  for (let i = 0; i < inner.length; i++) {
    const ch = inner[i];
    if (inStr) {
      cur += ch;
      if (ch === strCh && inner[i - 1] !== '\\') {
        if (inner[i + 1] === strCh) { cur += inner[i + 1]; i++; }
        else inStr = false;
      }
      continue;
    }
    if (ch === "'" || ch === '"') { inStr = true; strCh = ch; cur += ch; continue; }
    if (ch === ',') { push(); continue; }
    cur += ch;
  }
  push();
  return vals;
}

function parseDump(sql) {
  const tables = {};
  let pos = 0;
  while (true) {
    const start = sql.indexOf('INSERT INTO', pos);
    if (start === -1) break;
    const headMatch = /INSERT INTO `(\w+)`\s*\(([^)]+)\)\s*VALUES\s*/y;
    headMatch.lastIndex = start;
    const h = headMatch.exec(sql);
    if (!h) { pos = start + 11; continue; }
    const [, table, colsRaw] = h;
    const cols = [...colsRaw.matchAll(/`(\w+)`/g)].map((x) => x[1]);
    // scan rows: sequence of (...) tuples until ';' at depth 0
    let i = headMatch.lastIndex;
    let depth = 0, inStr = false, strCh = '', cur = '';
    const rows = [];
    const entry = (tables[table] = tables[table] || { cols, rows: [] });
    while (i < sql.length) {
      const ch = sql[i];
      if (inStr) {
        cur += ch;
        if (ch === strCh && sql[i - 1] !== '\\') {
          if (sql[i + 1] === strCh) { cur += sql[i + 1]; i++; }
          else inStr = false;
        }
        i++;
        continue;
      }
      if (ch === "'" || ch === '"') { inStr = true; strCh = ch; cur += ch; i++; continue; }
      if (ch === '(') { depth++; cur += ch; i++; continue; }
      if (ch === ')') {
        depth--; cur += ch; i++;
        if (depth === 0) { rows.push(parseRow(cur)); cur = ''; }
        continue;
      }
      if (ch === ';' && depth === 0) { i++; break; }
      if (depth > 0) cur += ch;
      i++;
    }
    entry.rows.push(...rows.map((r) => Object.fromEntries(cols.map((c, k) => [c, r[k] ?? null]))));
    pos = i;
  }
  return tables;
}

const num = (v) => (v === null || v === undefined || v === '' ? null : Number(v));
const dt = (v) => (v === null || v === undefined || v === '' ? null : new Date(String(v).includes(' ') ? String(v).replace(' ', 'T') + (/\d{2}:\d{2}(:\d{2})?$/.test(String(v)) ? '' : '') : v));

async function main() {
  if (!fs.existsSync(SQL_PATH)) { console.error(`SQL file not found: ${SQL_PATH}\nPass --sql "<path>"`); process.exit(1); }
  console.log(`Reading ${SQL_PATH} ...`);
  const tables = parseDump(fs.readFileSync(SQL_PATH, 'utf8'));
  console.log(`Parsed tables: ${Object.keys(tables).join(', ')}`);
  for (const [t, v] of Object.entries(tables)) console.log(`  ${t}: ${v.rows.length} rows`);

  const report = { parsed: Object.fromEntries(Object.entries(tables).map(([t, v]) => [t, v.rows.length])), inserted: {}, skipped: {}, quarantined: [] };
  if (DRY) {
    console.log('\n[DRY RUN] Validation only — no writes.');
    // FK validation highlights
    const userIds = new Set((tables.users?.rows || []).map((r) => r.id));
    for (const r of tables.applications_new?.rows || []) {
      if (!userIds.has(r.student_id)) report.quarantined.push({ table: 'applications_new', id: r.id, reason: `orphan student_id ${r.student_id}` });
    }
    console.log(`Orphan applications_new rows: ${report.quarantined.length}`);
    console.log(JSON.stringify(report, null, 2));
    return;
  }

  await mongoose.connect(MONGO);
  console.log('MongoDB connected');
  const M = {
    User: require('../src/models/User'),
    StudentProfile: require('../src/models/StudentProfile'),
    CompanyProfile: require('../src/models/CompanyProfile'),
    CompanyDocument: require('../src/models/CompanyDocument'),
    Skill: require('../src/models/Skill').Skill,
    StudentSkill: require('../src/models/Skill').StudentSkill,
    Job: require('../src/models/Job').Job,
    JobSkill: require('../src/models/Job').JobSkill,
    SavedJob: require('../src/models/Job').SavedJob,
    JobAlert: require('../src/models/Job').JobAlert,
    Application: require('../src/models/Application').Application,
    Selection: require('../src/models/Application').Selection,
    Offer: require('../src/models/Application').Offer,
    Placement: require('../src/models/Application').Placement,
    Drive: require('../src/models/Drive').PlacementDrive,
    DriveReg: require('../src/models/Drive').DriveRegistration,
    Interview: require('../src/models/Drive').Interview,
    Assessment: require('../src/models/Assessment').Assessment,
    Question: require('../src/models/Assessment').AssessmentQuestion,
    Attempt: require('../src/models/Assessment').AssessmentAttempt,
    Answer: require('../src/models/Assessment').AssessmentAnswer,
    Violation: require('../src/models/Assessment').ExamViolation,
    Edu: require('../src/models/Student').Education,
    Proj: require('../src/models/Student').Project,
    Cert: require('../src/models/Student').Certification,
    Resume: require('../src/models/Student').Resume,
    Pref: require('../src/models/Student').CareerPreference,
    Roadmap: require('../src/models/Student').CareerRoadmap,
    Gap: require('../src/models/Student').SkillGap,
    Notif: require('../src/models/Misc').Notification,
    Ann: require('../src/models/Misc').Announcement,
    Contact: require('../src/models/Misc').Contact,
    Audit: require('../src/models/Misc').AuditLog,
    EmailOtp: require('../src/models/Misc').EmailOtp,
    ResetOtp: require('../src/models/Misc').ResetOtp,
  };
  if (FRESH) { for (const m of Object.values(M)) await m.deleteMany({}); console.log('[fresh] collections cleared'); }

  const up = async (model, key, doc) => {
    const r = await model.findOneAndUpdate(key, { $setOnInsert: doc }, { upsert: true, new: true, setDefaultsOnInsert: true });
    return r;
  };
  const count = async (name, model) => { report.inserted[name] = await model.countDocuments(); };

  const userMap = {}, companyMap = {}, jobMap = {}, driveMap = {}, appMap = {}, assessMap = {}, qMap = {}, attemptMap = {};
  for (const r of tables.users?.rows || []) {
    const u = await up(M.User, { legacyId: r.id }, { legacyId: r.id, name: r.name, email: String(r.email).toLowerCase(), password: r.password, role: r.role, status: r.status, emailVerifiedAt: dt(r.email_verified_at), lastLogin: dt(r.last_login) });
    userMap[r.id] = u._id;
  }
  // Merge legacy admins row (same email as users.id=1)
  for (const r of tables.admins?.rows || []) {
    const u = await M.User.findOne({ email: String(r.email).toLowerCase() });
    if (u) { u.legacyAdminId = r.admin_id; await u.save(); }
  }
  report.skipped.legacy = { students: tables.students?.rows.length || 0, companies: tables.companies?.rows.length || 0, jobs: tables.jobs?.rows.length || 0, applications: tables.applications?.rows.length || 0, application_events: tables.application_events?.rows.length || 0, interviews: tables.interviews?.rows.length || 0, saved_jobs: tables.saved_jobs?.rows.length || 0, notifications: tables.notifications?.rows.length || 0 };
  console.log('[info] legacy mirror tables counted, not imported:', JSON.stringify(report.skipped.legacy));

  for (const r of tables.student_profiles?.rows || []) {
    if (!userMap[r.user_id]) { report.quarantined.push({ table: 'student_profiles', id: r.id, reason: `orphan user_id ${r.user_id}` }); continue; }
    await up(M.StudentProfile, { user: userMap[r.user_id] }, { user: userMap[r.user_id], legacyId: r.id, enrollmentNo: r.enrollment_no, phone: r.phone, dob: dt(r.dob), gender: r.gender, address: r.address, city: r.city, course: r.course, branch: r.branch, semester: r.semester, cgpa: num(r.cgpa), passingYear: num(r.passing_year), backlogs: num(r.backlogs) ?? 0, placementStatus: r.placement_status, profileCompletion: num(r.profile_completion) ?? 0, profilePhoto: r.profile_photo, about: r.about });
  }
  for (const r of tables.companies_new?.rows || []) {
    if (!userMap[r.user_id]) { report.quarantined.push({ table: 'companies_new', id: r.id, reason: `orphan user_id ${r.user_id}` }); continue; }
    const c = await up(M.CompanyProfile, { user: userMap[r.user_id] }, { user: userMap[r.user_id], legacyId: r.id, companyName: r.company_name, industry: r.industry, website: r.website, email: r.email, phone: r.phone, address: r.address, city: r.city, description: r.description, logo: r.logo, verificationStatus: r.verification_status });
    companyMap[r.id] = c._id;
  }
  for (const r of tables.company_documents?.rows || []) {
    if (!companyMap[r.company_id]) { report.quarantined.push({ table: 'company_documents', id: r.id, reason: `orphan company_id ${r.company_id}` }); continue; }
    await up(M.CompanyDocument, { legacyId: r.id }, { legacyId: r.id, company: companyMap[r.company_id], documentType: r.document_type, documentName: r.document_name, documentPath: r.document_path });
  }
  const skillMap = {};
  for (const r of tables.skills?.rows || []) {
    const s = await up(M.Skill, { skillName: r.skill_name }, { skillName: r.skill_name, category: r.category, legacyId: r.id });
    skillMap[r.id] = s._id;
  }
  for (const r of tables.jobs_new?.rows || []) {
    if (!companyMap[r.company_id]) { report.quarantined.push({ table: 'jobs_new', id: r.id, reason: `orphan company_id ${r.company_id}` }); continue; }
    const j = await up(M.Job, { legacyId: r.id }, { legacyId: r.id, company: companyMap[r.company_id], title: r.title, description: r.description, qualification: r.qualification, experience: r.experience, salaryMin: num(r.salary_min), salaryMax: num(r.salary_max), location: r.location, jobType: r.job_type, workMode: r.work_mode, vacancies: num(r.vacancies) ?? 1, internshipDuration: r.internship_duration, stipend: r.stipend, deadline: dt(r.deadline), status: r.status, approvalStatus: r.approval_status });
    jobMap[r.id] = j._id;
  }
  let dupSkills = 0;
  for (const r of tables.job_skills?.rows || []) {
    if (!jobMap[r.job_id] || !skillMap[r.skill_id]) { report.quarantined.push({ table: 'job_skills', id: r.id, reason: 'orphan job/skill' }); continue; }
    try { await M.JobSkill.create({ job: jobMap[r.job_id], skill: skillMap[r.skill_id], isRequired: !!r.is_required }); } catch (e) { if (e.code === 11000) dupSkills++; }
  }
  for (const r of tables.placement_drives?.rows || []) {
    if (!companyMap[r.company_id]) { report.quarantined.push({ table: 'placement_drives', id: r.id, reason: `orphan company_id ${r.company_id}` }); continue; }
    const elig = (tables.drive_eligibility?.rows || []).find((e) => e.drive_id === r.id) || {};
    const d = await up(M.Drive, { legacyId: r.id }, { legacyId: r.id, company: companyMap[r.company_id], job: jobMap[r.job_id] || null, driveTitle: r.drive_title, driveType: r.drive_type, description: r.description, driveDate: dt(r.drive_date), startTime: r.start_time, endTime: r.end_time, registrationStart: dt(r.registration_start), registrationEnd: dt(r.registration_end), venue: r.venue, mode: r.mode, status: r.status, createdBy: userMap[r.created_by] || null, eligibility: { minCgpa: num(elig.min_cgpa) ?? 0, maxBacklogs: num(elig.max_backlogs) ?? 10, allowedBranches: elig.allowed_branches, allowedCourses: elig.allowed_courses, passingYear: num(elig.passing_year), requiredExperience: elig.required_experience, requiredSkills: elig.required_skills } });
    driveMap[r.id] = d._id;
  }
  for (const r of tables.applications_new?.rows || []) {
    if (!userMap[r.student_id] || !jobMap[r.job_id]) { report.quarantined.push({ table: 'applications_new', id: r.id, reason: 'orphan student/job' }); continue; }
    try {
      const a = await M.Application.create({ legacyId: r.id, student: userMap[r.student_id], job: jobMap[r.job_id], drive: driveMap[r.drive_id] || null, status: r.status, coverLetter: r.cover_letter });
      appMap[r.id] = a._id;
    } catch (e) { if (e.code === 11000) { const ex = await M.Application.findOne({ job: jobMap[r.job_id], student: userMap[r.student_id] }); if (ex) appMap[r.id] = ex._id; } }
  }
  for (const r of tables.drive_registrations?.rows || []) {
    if (!driveMap[r.drive_id] || !userMap[r.student_id]) { report.quarantined.push({ table: 'drive_registrations', id: r.id, reason: 'orphan drive/student' }); continue; }
    try { await M.DriveReg.create({ legacyId: r.id, drive: driveMap[r.drive_id], student: userMap[r.student_id], eligibilityStatus: r.eligibility_status, status: r.status }); } catch (e) { if (e.code !== 11000) throw e; }
  }
  const selMap = {};
  for (const r of tables.selections?.rows || []) {
    if (!appMap[r.application_id]) { report.quarantined.push({ table: 'selections', id: r.id, reason: `orphan application ${r.application_id}` }); continue; }
    try {
      const s = await M.Selection.create({ legacyId: r.id, application: appMap[r.application_id], company: companyMap[r.company_id], student: userMap[r.student_id], selectionStatus: r.selection_status, remarks: r.remarks });
      selMap[r.id] = s._id;
    } catch (e) { if (e.code !== 11000) throw e; }
  }
  const offerMap = {};
  for (const r of tables.offers?.rows || []) {
    if (!userMap[r.student_id] || !companyMap[r.company_id] || !jobMap[r.job_id]) { report.quarantined.push({ table: 'offers', id: r.id, reason: 'orphan ref' }); continue; }
    const o = await up(M.Offer, { legacyId: r.id }, { legacyId: r.id, selection: selMap[r.selection_id] || null, student: userMap[r.student_id], company: companyMap[r.company_id], job: jobMap[r.job_id], position: r.position, salary: r.salary, joiningDate: dt(r.joining_date), location: r.location, employmentType: r.employment_type, offerExpiry: dt(r.offer_expiry), issueDate: dt(r.issue_date), offerLetter: r.offer_letter, status: r.status });
    offerMap[r.id] = o._id;
  }
  for (const r of tables.placements?.rows || []) {
    if (!userMap[r.student_id]) { report.quarantined.push({ table: 'placements', id: r.id, reason: 'orphan student' }); continue; }
    await up(M.Placement, { legacyId: r.id }, { legacyId: r.id, student: userMap[r.student_id], company: companyMap[r.company_id], job: jobMap[r.job_id], offer: offerMap[r.offer_id] || null, position: r.position, package: r.package, joiningDate: dt(r.joining_date), location: r.location, placementDate: dt(r.placement_date), status: r.status });
  }
  for (const r of tables.interviews_new?.rows || []) {
    if (!appMap[r.application_id]) { report.quarantined.push({ table: 'interviews_new', id: r.id, reason: `orphan application ${r.application_id}` }); continue; }
    await up(M.Interview, { legacyId: r.id }, { legacyId: r.id, application: appMap[r.application_id], company: companyMap[r.company_id], student: userMap[r.student_id], roundName: r.round_name, interviewDate: dt(r.interview_date), interviewTime: r.interview_time, mode: r.mode, meetingLink: r.meeting_link, location: r.location, interviewer: r.interviewer, notes: r.notes, status: r.status, result: r.result });
  }
  for (const r of tables.assessments?.rows || []) {
    if (!companyMap[r.company_id]) { report.quarantined.push({ table: 'assessments', id: r.id, reason: 'orphan company' }); continue; }
    const a = await up(M.Assessment, { legacyId: r.id }, { legacyId: r.id, company: companyMap[r.company_id], job: jobMap[r.job_id] || null, title: r.title, description: r.description, durationMinutes: r.duration_minutes, totalMarks: r.total_marks, marksPerQuestion: r.marks_per_question, numQuestions: r.num_questions, difficulty: r.difficulty, categories: r.categories, technology: r.technology, passingPercentage: r.passing_percentage, status: r.status });
    assessMap[r.id] = a._id;
  }
  for (const r of tables.assessment_questions?.rows || []) {
    if (!assessMap[r.assessment_id]) { report.quarantined.push({ table: 'assessment_questions', id: r.id, reason: 'orphan assessment' }); continue; }
    const q = await up(M.Question, { legacyId: r.id }, { legacyId: r.id, assessment: assessMap[r.assessment_id], question: r.question, questionType: r.question_type, optionA: r.option_a, optionB: r.option_b, optionC: r.option_c, optionD: r.option_d, correctAnswer: r.correct_answer, marks: num(r.marks) ?? 1 });
    qMap[r.id] = q._id;
  }
  for (const r of tables.assessment_attempts?.rows || []) {
    if (!assessMap[r.assessment_id] || !userMap[r.student_id]) { report.quarantined.push({ table: 'assessment_attempts', id: r.id, reason: 'orphan ref' }); continue; }
    try {
      const at = await M.Attempt.create({ legacyId: r.id, assessment: assessMap[r.assessment_id], student: userMap[r.student_id], startedAt: dt(r.started_at), submittedAt: dt(r.submitted_at), score: num(r.score) ?? 0, percentage: num(r.percentage) ?? 0, result: r.result, expiresAt: dt(r.expires_at), integrityStatus: r.integrity_status, violationCount: num(r.violation_count) ?? 0, sessionId: r.session_id, status: r.status });
      attemptMap[r.id] = at._id;
    } catch (e) { if (e.code !== 11000) throw e; }
  }
  for (const r of tables.assessment_answers?.rows || []) {
    if (!attemptMap[r.attempt_id] || !qMap[r.question_id]) { report.quarantined.push({ table: 'assessment_answers', id: r.id, reason: 'orphan attempt/question' }); continue; }
    try { await M.Answer.create({ legacyId: r.id, attempt: attemptMap[r.attempt_id], question: qMap[r.question_id], selectedAnswer: r.selected_answer, isCorrect: !!r.is_correct, marksObtained: num(r.marks_obtained) ?? 0 }); } catch (e) { if (e.code !== 11000) throw e; }
  }
  for (const r of tables.exam_violations?.rows || []) {
    if (!attemptMap[r.attempt_id]) { report.quarantined.push({ table: 'exam_violations', id: r.id, reason: 'orphan attempt' }); continue; }
    await up(M.Violation, { legacyId: r.id }, { legacyId: r.id, attempt: attemptMap[r.attempt_id], student: userMap[r.student_id], violationType: r.violation_type, description: r.description, severity: r.severity });
  }
  const bulk = async (rows, fn) => { for (const r of rows || []) await fn(r); };
  await bulk(tables.education?.rows, async (r) => {
    if (!userMap[r.student_id]) return report.quarantined.push({ table: 'education', id: r.id, reason: 'orphan student' });
    await up(M.Edu, { legacyId: r.id }, { legacyId: r.id, student: userMap[r.student_id], qualification: r.qualification, institute: r.institute, board: r.board, stream: r.stream, university: r.university, course: r.course, branch: r.branch, passingYear: num(r.passing_year), percentage: num(r.percentage), cgpa: num(r.cgpa) });
  });
  await bulk(tables.student_skills?.rows, async (r) => {
    if (!userMap[r.student_id] || !skillMap[r.skill_id]) return report.quarantined.push({ table: 'student_skills', id: r.id, reason: 'orphan ref' });
    try { await M.StudentSkill.create({ legacyId: r.id, student: userMap[r.student_id], skill: skillMap[r.skill_id], proficiency: r.proficiency }); } catch (e) { if (e.code !== 11000) throw e; }
  });
  await bulk(tables.projects?.rows, async (r) => {
    if (!userMap[r.student_id]) return report.quarantined.push({ table: 'projects', id: r.id, reason: 'orphan student' });
    await up(M.Proj, { legacyId: r.id }, { legacyId: r.id, student: userMap[r.student_id], title: r.title, description: r.description, technologies: r.technologies, projectUrl: r.project_url, githubUrl: r.github_url, startDate: dt(r.start_date), endDate: dt(r.end_date) });
  });
  await bulk(tables.certifications?.rows, async (r) => {
    if (!userMap[r.student_id]) return report.quarantined.push({ table: 'certifications', id: r.id, reason: 'orphan student' });
    await up(M.Cert, { legacyId: r.id }, { legacyId: r.id, student: userMap[r.student_id], name: r.name, issuingOrganization: r.issuing_organization, issueDate: dt(r.issue_date), credentialUrl: r.credential_url });
  });
  await bulk(tables.resumes?.rows, async (r) => {
    if (!userMap[r.student_id]) return report.quarantined.push({ table: 'resumes', id: r.id, reason: 'orphan student' });
    await up(M.Resume, { legacyId: r.id }, { legacyId: r.id, student: userMap[r.student_id], fileName: r.file_name, filePath: r.file_path, fileType: r.file_type, fileSize: num(r.file_size) });
  });
  await bulk(tables.career_preferences?.rows, async (r) => {
    if (!userMap[r.student_id]) return report.quarantined.push({ table: 'career_preferences', id: r.id, reason: 'orphan student' });
    await M.Pref.findOneAndUpdate({ student: userMap[r.student_id] }, { student: userMap[r.student_id], legacyId: r.id, preferredRole: r.preferred_role, preferredLocation: r.preferred_location, preferredJobType: r.preferred_job_type, expectedSalary: r.expected_salary, workMode: r.work_mode, experienceLevel: r.experience_level }, { upsert: true });
  });
  const roadmaps = {};
  await bulk(tables.career_roadmaps?.rows, async (r) => {
    if (!userMap[r.student_id]) return report.quarantined.push({ table: 'career_roadmaps', id: r.id, reason: 'orphan student' });
    const rm = await up(M.Roadmap, { legacyId: r.id }, { legacyId: r.id, student: userMap[r.student_id], careerGoal: r.career_goal, description: r.description, duration: r.duration, items: [] });
    roadmaps[r.id] = rm._id;
  });
  await bulk(tables.roadmap_items?.rows, async (r) => {
    if (!roadmaps[r.roadmap_id]) return report.quarantined.push({ table: 'roadmap_items', id: r.id, reason: 'orphan roadmap' });
    await M.Roadmap.findByIdAndUpdate(roadmaps[r.roadmap_id], { $push: { items: { skillName: r.skill_name, description: r.description, priority: r.priority, sequenceNo: r.sequence_no, status: r.status, legacyId: r.id } } });
  });
  await bulk(tables.saved_jobs_new?.rows, async (r) => {
    if (!userMap[r.student_id] || !jobMap[r.job_id]) return report.quarantined.push({ table: 'saved_jobs_new', id: r.id, reason: 'orphan ref' });
    try { await M.SavedJob.create({ legacyId: r.id, student: userMap[r.student_id], job: jobMap[r.job_id] }); } catch (e) { if (e.code !== 11000) throw e; }
  });
  await bulk(tables.job_alerts?.rows, async (r) => {
    if (!userMap[r.student_id]) return report.quarantined.push({ table: 'job_alerts', id: r.id, reason: 'orphan student' });
    await up(M.JobAlert, { legacyId: r.id }, { legacyId: r.id, student: userMap[r.student_id], roleKeyword: r.role_keyword, location: r.location, minSalary: num(r.min_salary), isActive: !!r.is_active });
  });
  await bulk(tables.skill_gap?.rows, async (r) => {
    if (!userMap[r.student_id]) return report.quarantined.push({ table: 'skill_gap', id: r.id, reason: 'orphan student' });
    const { SkillGap } = require('../src/models/Student');
    await SkillGap.findOneAndUpdate({ legacyId: r.id }, { legacyId: r.id, student: userMap[r.student_id], job: jobMap[r.job_id] || null, skill: skillMap[r.skill_id] || null, currentLevel: r.current_level, requiredLevel: r.required_level, gapStatus: r.gap_status }, { upsert: true });
  });
  await bulk(tables.notifications_new?.rows, async (r) => {
    if (!userMap[r.user_id]) return report.quarantined.push({ table: 'notifications_new', id: r.id, reason: 'orphan user' });
    await up(M.Notif, { legacyId: r.id }, { legacyId: r.id, user: userMap[r.user_id], title: r.title, message: r.message, type: r.type, referenceId: r.reference_id, actionUrl: r.action_url, priority: r.priority, isRead: !!r.is_read });
  });
  await bulk(tables.announcements?.rows, async (r) => {
    await up(M.Ann, { legacyId: r.id }, { legacyId: r.id, createdBy: userMap[r.created_by] || Object.values(userMap)[0], title: r.title, message: r.message, targetRole: r.target_role, targetCourse: r.target_course, targetBranch: r.target_branch, publishDate: dt(r.publish_date), expiryDate: dt(r.expiry_date), status: r.status });
  });
  await bulk(tables.contacts?.rows, async (r) => {
    await up(M.Contact, { legacyId: r.contact_id }, { legacyId: r.contact_id, name: r.name, email: r.email, subject: r.subject, message: r.message, status: r.status });
  });
  await bulk(tables.audit_logs?.rows, async (r) => {
    await up(M.Audit, { legacyId: r.id }, { legacyId: r.id, user: userMap[r.user_id] || null, action: r.action, module: r.module, description: r.description, ipAddress: r.ip_address });
  });
  await bulk(tables.email_verification_otps?.rows, async (r) => {
    if (!userMap[r.user_id]) return;
    await up(M.EmailOtp, { legacyId: r.id }, { legacyId: r.id, user: userMap[r.user_id], otpHash: r.otp_hash, expiresAt: dt(r.expires_at), attempts: r.attempts ?? 0, lastSentAt: dt(r.last_sent_at), verifiedAt: dt(r.verified_at) });
  });
  await bulk(tables.password_reset_otps?.rows, async (r) => {
    await up(M.ResetOtp, { legacyId: r.id }, { legacyId: r.id, email: String(r.email).toLowerCase(), role: r.role, otpHash: r.otp_hash, expiresAt: dt(r.expires_at), attempts: r.attempts ?? 0, lastSentAt: dt(r.last_sent_at), verifiedAt: dt(r.verified_at) });
  });

  for (const [k, model] of Object.entries(M)) { try { report.inserted[k] = await model.countDocuments(); } catch { } }
  fs.writeFileSync(path.join(__dirname, 'migration-report.json'), JSON.stringify(report, null, 2));
  fs.writeFileSync(path.join(__dirname, 'migration-errors.json'), JSON.stringify(report.quarantined, null, 2));
  console.log('\n==== MIGRATION REPORT ====');
  console.log(JSON.stringify({ inserted: report.inserted, skippedLegacy: report.skipped.legacy, quarantined: report.quarantined.length }, null, 2));
  console.log('Recovery: re-run is idempotent (upserts on legacyId). Quarantined rows in scripts/migration-errors.json were NOT imported — fix source data and re-run.');
  await mongoose.disconnect();
}

main().catch((e) => { console.error(e); process.exit(1); });
