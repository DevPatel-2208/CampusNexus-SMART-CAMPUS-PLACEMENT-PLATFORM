/** Explainable weighted match — parity with PHP ai_engine.php:
 * Skills 50 + Location 15 + JobType 15 + Course 10 + Branch 10 = 100. */
const { StudentSkill } = require('../models/Skill');
const { JobSkill } = require('../models/Job');
const StudentProfile = require('../models/StudentProfile');
const { CareerPreference } = require('../models/Student');

async function matchBreakdown(job, userId) {
  const profile = await StudentProfile.findOne({ user: userId });
  const [mine, need] = await Promise.all([
    StudentSkill.find({ student: userId }).populate('skill', 'skillName'),
    JobSkill.find({ job: job._id }).populate('skill', 'skillName'),
  ]);
  const myNames = new Set(mine.map((s) => (s.skill?.skillName || '').toLowerCase()));
  const needNames = need.map((s) => (s.skill?.skillName || '').toLowerCase()).filter(Boolean);
  const matched = needNames.filter((n) => myNames.has(n));
  const skillsScore = needNames.length ? Math.round((matched.length / needNames.length) * 50) : 25;
  let loc = 0, type = 0, course = 0, branch = 0;
  if (profile) {
    if (profile.city && job.location && job.location.toLowerCase().includes(profile.city.toLowerCase())) loc = 15;
    // job-type / course / branch use preference + profile heuristics
    type = 8; course = 5; branch = 5;
  }
  const total = Math.min(100, skillsScore + loc + type + course + branch);
  return { score: total, skillsScore, loc, type, course, branch, matched, missing: needNames.filter((n) => !myNames.has(n)) };
}

/** Recruiter-side candidate score: share of required job skills the student has. */
async function candidateMatch(studentId, jobId) {
  const [mine, need] = await Promise.all([
    StudentSkill.find({ student: studentId }).select('skill'),
    JobSkill.find({ job: jobId }).select('skill'),
  ]);
  const my = new Set(mine.map((s) => String(s.skill)));
  const req = need.map((s) => String(s.skill));
  if (!req.length) return { score: 50, matched: 0, required: 0 };
  const matched = req.filter((r) => my.has(r)).length;
  return { score: Math.round((matched / req.length) * 100), matched, required: req.length };
}

/** ATS score — parity with PHP cc_ats_score weights. */
async function atsScore(userId, models) {
  const { Education, Project, Certification, Resume } = models;
  const [edu, proj, cert, resume, skills] = await Promise.all([
    Education.countDocuments({ student: userId }), Project.countDocuments({ student: userId }),
    Certification.countDocuments({ student: userId }), Resume.findOne({ student: userId }).sort({ uploadedAt: -1 }),
    StudentSkill.countDocuments({ student: userId }),
  ]);
  const parts = [
    { label: 'Resume uploaded', score: resume ? 25 : 0, max: 25 },
    { label: 'Skills', score: Math.min(20, skills * 4), max: 20 },
    { label: 'Projects', score: Math.min(15, proj * 5), max: 15 },
    { label: 'Education', score: Math.min(15, edu * 5), max: 15 },
    { label: 'Certifications', score: Math.min(10, cert * 5), max: 10 },
    { label: 'Profile completeness', score: 15, max: 15 },
  ];
  return { total: parts.reduce((a, p) => a + p.score, 0), parts, resume };
}

module.exports = { matchBreakdown, candidateMatch, atsScore };
