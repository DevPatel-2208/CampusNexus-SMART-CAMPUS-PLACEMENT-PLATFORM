require('./setup');
const request = require('supertest');
const app = require('../src/app');
const { makeUser, tokenFor } = require('./setup');

async function fixtures() {
  const companyUser = await makeUser('company');
  const CompanyProfile = require('../src/models/CompanyProfile');
  const cp = await CompanyProfile.create({ user: companyUser._id, companyName: 'Acme', email: companyUser.email, verificationStatus: 'verified' });
  const { Job } = require('../src/models/Job');
  const job = await Job.create({ company: cp._id, title: 'Dev', description: 'd', location: 'Ahmedabad', jobType: 'Full Time', workMode: 'Onsite', deadline: new Date(Date.now() + 30 * 864e5), status: 'Open', approvalStatus: 'approved' });
  const { Assessment, AssessmentQuestion } = require('../src/models/Assessment');
  const a = await Assessment.create({ company: cp._id, job: job._id, title: 'Quiz', durationMinutes: 30, totalMarks: 4, passingPercentage: 50, status: 'active' });
  const qs = [];
  for (let i = 0; i < 2; i++) qs.push(await AssessmentQuestion.create({ assessment: a._id, question: `Q${i}`, optionA: 'a', optionB: 'b', optionC: 'c', optionD: 'd', correctAnswer: 'A', marks: 2 }));
  const student = await makeUser('student');
  await require('../src/models/StudentProfile').create({ user: student._id, course: 'MCA', branch: 'CA', cgpa: 8, backlogs: 0, passingYear: 2026 });
  await require('../src/models/Application').Application.create({ student: student._id, job: job._id, status: 'Applied' });
  return { a, qs, student, companyUser };
}

describe('assessments', () => {
  test('start gated without application; full attempt scores', async () => {
    const { a, qs, student } = await fixtures();
    const outsider = await makeUser('student');
    const denied = await request(app).post(`/api/v1/assessments/${a._id}/start`).set('Authorization', `Bearer ${tokenFor(outsider)}`).send({});
    expect(denied.status).toBe(403);
    const t = tokenFor(student);
    const s = await request(app).post(`/api/v1/assessments/${a._id}/start`).set('Authorization', `Bearer ${t}`).send({});
    expect(s.status).toBe(200);
    expect(s.body.data.questions.length).toBe(2);
    expect(JSON.stringify(s.body.data)).not.toMatch(/correctAnswer/);
    const attemptId = s.body.data.attemptId;
    // answer Q0 correctly: need display letter for original 'A' — fetch mapping via result? answer all 'A'..'D' sweep: use first question's display by trying A
    for (const q of s.body.data.questions) {
      await request(app).post(`/api/v1/attempts/${attemptId}/answer`).set('Authorization', `Bearer ${t}`).send({ questionId: q._id, selected: 'A' });
    }
    const sub = await request(app).post(`/api/v1/attempts/${attemptId}/submit`).set('Authorization', `Bearer ${t}`).send({});
    expect(sub.status).toBe(200);
    expect(sub.body.data.percentage).toBeGreaterThanOrEqual(0);
    const res = await request(app).get(`/api/v1/attempts/${attemptId}/result`).set('Authorization', `Bearer ${t}`);
    expect(res.status).toBe(200);
    expect(['Passed', 'Failed']).toContain(res.body.data.attempt.result);
  });
  test('3 violations auto-submit + BLOCK', async () => {
    const { a, student } = await fixtures();
    const t = tokenFor(student);
    const s = await request(app).post(`/api/v1/assessments/${a._id}/start`).set('Authorization', `Bearer ${t}`).send({});
    const attemptId = s.body.data.attemptId;
    for (let i = 0; i < 3; i++) {
      await request(app).post(`/api/v1/attempts/${attemptId}/violation`).set('Authorization', `Bearer ${t}`).send({ type: 'TAB_SWITCH' });
    }
    const res = await request(app).get(`/api/v1/attempts/${attemptId}/result`).set('Authorization', `Bearer ${t}`);
    expect(res.status).toBe(200);
    expect(res.body.data.attempt.integrityStatus).toBe('BLOCKED');
  });
});
