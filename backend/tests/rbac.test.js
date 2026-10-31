require('./setup');
const request = require('supertest');
const app = require('../src/app');
const { makeUser, tokenFor } = require('./setup');

describe('rbac', () => {
  test('student blocked from tpo/company endpoints', async () => {
    const s = await makeUser('student');
    const t = tokenFor(s);
    for (const [m, url] of [['get', '/api/v1/tpo/dashboard'], ['get', '/api/v1/company/dashboard'], ['get', '/api/v1/tpo/students'], ['get', '/api/v1/audit-logs']]) {
      const r = await request(app)[m](url).set('Authorization', `Bearer ${t}`);
      expect([403, 404]).toContain(r.status);
    }
  });
  test('company cannot post job before verification', async () => {
    const c = await makeUser('company');
    await require('../src/models/CompanyProfile').create({ user: c._id, companyName: 'NewCo', email: c.email, verificationStatus: 'pending' });
    const r = await request(app).post('/api/v1/company/jobs').set('Authorization', `Bearer ${tokenFor(c)}`).send({ title: 'X', description: 'd', location: 'A', jobType: 'Full Time', workMode: 'Onsite', deadline: new Date(Date.now() + 864e5).toISOString() });
    expect(r.status).toBe(403);
  });
  test('unauthenticated blocked', async () => {
    const r = await request(app).get('/api/v1/notifications');
    expect(r.status).toBe(401);
  });
  test('admin back-office: admin in, others out', async () => {
    const admin = await makeUser('admin');
    const s = await makeUser('student');
    const ok = await request(app).get('/api/v1/admin/dashboard').set('Authorization', `Bearer ${tokenFor(admin)}`);
    expect(ok.status).toBe(200);
    expect(ok.body.data.kpis).toBeDefined();
    for (const url of ['/api/v1/admin/dashboard', '/api/v1/admin/users', '/api/v1/admin/companies']) {
      const r = await request(app).get(url).set('Authorization', `Bearer ${tokenFor(s)}`);
      expect(r.status).toBe(403);
    }
  });
  test('admin cannot deactivate own account', async () => {
    const admin = await makeUser('admin');
    const r = await request(app).patch(`/api/v1/admin/users/${admin._id}/status`).set('Authorization', `Bearer ${tokenFor(admin)}`).send({ status: 'blocked' });
    expect(r.status).toBe(400);
  });
  test('tpo company detail + drive history', async () => {
    const tpo = await makeUser('tpo');
    const t = tokenFor(tpo);
    const c = await makeUser('company');
    const cp = await require('../src/models/CompanyProfile').create({ user: c._id, companyName: 'HistCo', email: c.email, verificationStatus: 'verified' });
    const d = await request(app).get(`/api/v1/tpo/companies/${cp._id}`).set('Authorization', `Bearer ${t}`);
    expect(d.status).toBe(200);
    expect(d.body.data.company.companyName).toBe('HistCo');
    expect(d.body.data.counts).toBeDefined();
    const h = await request(app).get('/api/v1/drives/history').set('Authorization', `Bearer ${t}`);
    expect(h.status).toBe(200);
    expect(h.body.summary).toBeDefined();
    const s = await makeUser('student');
    const denied = await request(app).get('/api/v1/drives/history').set('Authorization', `Bearer ${tokenFor(s)}`);
    expect(denied.status).toBe(403);
  });
  test('offer edit locked unless draft/pending', async () => {
    const c = await makeUser('company');
    const cp = await require('../src/models/CompanyProfile').create({ user: c._id, companyName: 'OffCo', email: c.email, verificationStatus: 'verified' });
    const st = await makeUser('student');
    const { Job } = require('../src/models/Job');
    const job = await Job.create({ company: cp._id, title: 'Dev', description: 'd', location: 'A', jobType: 'Full Time', workMode: 'Onsite', deadline: new Date(Date.now() + 864e5), status: 'Open', approvalStatus: 'approved' });
    const { Offer } = require('../src/models/Application');
    const issued = await Offer.create({ student: st._id, company: cp._id, job: job._id, position: 'Dev', status: 'issued' });
    const locked = await request(app).patch(`/api/v1/offers/${issued._id}`).set('Authorization', `Bearer ${tokenFor(c)}`).send({ position: 'Senior Dev' });
    expect(locked.status).toBe(400);
    const draft = await Offer.create({ student: st._id, company: cp._id, job: job._id, position: 'Dev', status: 'draft' });
    const edited = await request(app).patch(`/api/v1/offers/${draft._id}`).set('Authorization', `Bearer ${tokenFor(c)}`).send({ position: 'Senior Dev' });
    expect(edited.status).toBe(200);
    expect(edited.body.data.position).toBe('Senior Dev');
    const mine = await request(app).get(`/api/v1/offers/${draft._id}`).set('Authorization', `Bearer ${tokenFor(st)}`);
    expect(mine.status).toBe(200);
  });
  test('question generation requires topic for technical assessments', async () => {
    const c = await makeUser('company');
    await require('../src/models/CompanyProfile').create({ user: c._id, companyName: 'GenCo', email: c.email, verificationStatus: 'verified' });
    const { Assessment } = require('../src/models/Assessment');
    const a = await Assessment.create({ company: (await require('../src/models/CompanyProfile').findOne({ user: c._id }))._id, title: 'Tech Test', categories: 'Technical', technology: '', durationMinutes: 30, totalMarks: 100 });
    const r = await request(app).post(`/api/v1/assessments/${a._id}/generate`).set('Authorization', `Bearer ${tokenFor(c)}`).send({ count: 5 });
    expect(r.status).toBe(400);
  });
});
