require('./setup');
const request = require('supertest');
const app = require('../src/app');
const { makeUser, tokenFor } = require('./setup');

async function fixtures() {
  const tpo = await makeUser('tpo');
  const companyUser = await makeUser('company');
  const CompanyProfile = require('../src/models/CompanyProfile');
  const cp = await CompanyProfile.create({ user: companyUser._id, companyName: 'Acme', email: companyUser.email, verificationStatus: 'verified' });
  const { Job } = require('../src/models/Job');
  const job = await Job.create({ company: cp._id, title: 'Dev', description: 'd', location: 'Ahmedabad', jobType: 'Full Time', workMode: 'Onsite', deadline: new Date(Date.now() + 30 * 864e5), status: 'Open', approvalStatus: 'approved' });
  const student = await makeUser('student');
  await require('../src/models/StudentProfile').create({ user: student._id, course: 'MCA', branch: 'Computer Applications', cgpa: 8.5, backlogs: 0, passingYear: 2026 });
  return { tpo, companyUser, cp, job, student };
}

describe('applications', () => {
  test('apply + duplicate blocked (409)', async () => {
    const { job, student } = await fixtures();
    const t = tokenFor(student);
    const r1 = await request(app).post('/api/v1/applications').set('Authorization', `Bearer ${t}`).send({ jobId: job._id });
    expect(r1.status).toBe(201);
    const r2 = await request(app).post('/api/v1/applications').set('Authorization', `Bearer ${t}`).send({ jobId: job._id });
    expect(r2.status).toBe(409);
  });
  test('apply closed job rejected', async () => {
    const { job, student } = await fixtures();
    job.status = 'Closed'; await job.save();
    const r = await request(app).post('/api/v1/applications').set('Authorization', `Bearer ${tokenFor(student)}`).send({ jobId: job._id });
    expect(r.status).toBe(400);
  });
  test('student cannot read another student application', async () => {
    const { job, student } = await fixtures();
    const other = await makeUser('student');
    const t = tokenFor(student);
    const r1 = await request(app).post('/api/v1/applications').set('Authorization', `Bearer ${t}`).send({ jobId: job._id });
    const r2 = await request(app).get(`/api/v1/applications/${r1.body.data._id}`).set('Authorization', `Bearer ${tokenFor(other)}`);
    expect(r2.status).toBe(403);
  });
});
