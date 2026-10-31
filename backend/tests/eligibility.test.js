require('./setup');
const { checkJobEligibility, checkDriveEligibility } = require('../src/services/eligibility.service');

describe('eligibility engine', () => {
  test('job gate: closed job ineligible', () => {
    const r = checkJobEligibility({ approvalStatus: 'approved', status: 'Closed', deadline: new Date(Date.now() + 864e5) }, { cgpa: 8, course: 'MCA', branch: 'CA', passingYear: 2026 });
    expect(r.eligible).toBe(false);
  });
  test('drive gate: low CGPA + backlog + branch', async () => {
    const StudentProfile = require('../src/models/StudentProfile');
    const { makeUser } = require('./setup');
    const u = await makeUser('student');
    await StudentProfile.create({ user: u._id, course: 'BCA', branch: 'Mechanical', cgpa: 6, backlogs: 3, passingYear: 2027 });
    const drive = { eligibility: { minCgpa: 7.5, maxBacklogs: 0, allowedBranches: 'Computer Applications,Computer Science', allowedCourses: 'MCA', passingYear: 2026 }, status: 'registration_open' };
    const r = await checkDriveEligibility(drive, u._id);
    expect(r.eligible).toBe(false);
    expect(r.reasons.map((x) => x.label).join('|')).toMatch(/CGPA|Backlogs|Branch|Course|Passing/);
  });
});
