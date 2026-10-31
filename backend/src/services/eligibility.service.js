const StudentProfile = require('../models/StudentProfile');

/** Eligibility engine — exact parity with PHP rules (see docs/PROJECT_AUDIT.md §4). */

function csvList(s) {
  return String(s || '').split(',').map((x) => x.trim().toLowerCase()).filter(Boolean);
}

async function studentSnapshot(userId) {
  const profile = await StudentProfile.findOne({ user: userId });
  return profile;
}

/** Job-level eligibility for the browse badge + apply gate. */
function checkJobEligibility(job, profile) {
  const reasons = [];
  if (!profile || profile.cgpa === null || profile.cgpa === undefined || !profile.course || !profile.branch || !profile.passingYear) {
    reasons.push('Complete profile');
  }
  if (job.approvalStatus !== 'approved' || job.status !== 'Open') reasons.push('Job not open');
  if (job.deadline && new Date(job.deadline) < new Date(new Date().toDateString())) reasons.push('Deadline over');
  return { eligible: reasons.length === 0, reasons };
}

/** Drive-level eligibility breakdown.
 *  Reasons mirror the PHP `student/drive_details.php` copy exactly and are
 *  returned as `{ label, detail }` so the UI can render them clearly. */
async function checkDriveEligibility(drive, userId) {
  const reasons = [];
  const profile = await StudentProfile.findOne({ user: userId });
  if (!profile) return { eligible: false, reasons: [{ label: 'Profile', detail: 'Please complete your student profile to check eligibility' }], profile: null };
  const e = drive.eligibility || {};
  if (profile.cgpa === null || profile.cgpa === undefined) {
    reasons.push({ label: 'Profile', detail: 'Please complete your student profile to check eligibility' });
  } else if ((e.minCgpa ?? 0) > 0 && profile.cgpa < e.minCgpa) {
    reasons.push({ label: 'CGPA', detail: `Your CGPA ${profile.cgpa} is below the required ${e.minCgpa}` });
  }
  if ((e.maxBacklogs ?? 10) < 50 && (profile.backlogs ?? 0) > (e.maxBacklogs ?? 10)) {
    reasons.push({ label: 'Backlogs', detail: `Your backlogs (${profile.backlogs ?? 0}) exceed the maximum allowed (${e.maxBacklogs ?? 10})` });
  }
  const branches = csvList(e.allowedBranches);
  if (branches.length && profile.branch && !branches.includes(profile.branch.trim().toLowerCase()) && !branches.includes('all')) {
    reasons.push({ label: 'Branch', detail: `${profile.branch} is not in the allowed branches` });
  }
  const courses = csvList(e.allowedCourses);
  if (courses.length && profile.course && !courses.includes(profile.course.trim().toLowerCase()) && !courses.includes('all')) {
    reasons.push({ label: 'Course', detail: `${profile.course} is not in the allowed courses` });
  }
  if (e.passingYear && profile.passingYear && Number(profile.passingYear) !== Number(e.passingYear)) {
    reasons.push({ label: 'Passing Year', detail: `Required: ${e.passingYear}, Yours: ${profile.passingYear}` });
  }
  const now = new Date();
  if (drive.registrationStart && now < new Date(drive.registrationStart)) reasons.push({ label: 'Registration', detail: 'Registration has not opened yet' });
  if (drive.registrationEnd && now > new Date(drive.registrationEnd)) reasons.push({ label: 'Registration', detail: 'Registration has closed' });
  if (['completed', 'cancelled'].includes(drive.status)) reasons.push({ label: 'Drive', detail: `This drive is ${drive.status}` });
  return { eligible: reasons.length === 0, reasons, profile };
}

function driveRegistrationOpen(drive) {
  if (['completed', 'cancelled', 'registration_closed'].includes(drive.status)) return false;
  const now = new Date();
  if (drive.registrationStart && now < new Date(drive.registrationStart)) return false;
  if (drive.registrationEnd && now > new Date(drive.registrationEnd)) return false;
  return true;
}

module.exports = { csvList, studentSnapshot, checkJobEligibility, checkDriveEligibility, driveRegistrationOpen };
