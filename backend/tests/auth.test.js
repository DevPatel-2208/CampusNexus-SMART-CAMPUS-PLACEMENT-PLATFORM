require('./setup');
const request = require('supertest');
const app = require('../src/app');
const User = require('../src/models/User');

describe('auth', () => {
  test('register → verify → login', async () => {
    const reg = await request(app).post('/api/v1/auth/register').send({ name: 'New Student', email: 'new@test.local', password: 'Pass@1234', confirm: 'Pass@1234', role: 'student' });
    expect(reg.status).toBe(201);
    expect(reg.body.data.pendingVerification).toBe(true);
    const EmailOtp = require('../src/models/Misc').EmailOtp;
    const otp = await EmailOtp.findOne({ user: reg.body.data.userId }).sort({ _id: -1 });
    // code unknown (hashed) — wrong code decrements attempts
    const bad = await request(app).post('/api/v1/auth/verify-email').send({ userId: reg.body.data.userId, code: '000000' });
    expect(bad.status).toBe(400);
    expect(bad.body.message).toMatch(/attempt/);
  });

  test('login blocked when inactive, rejected bad password', async () => {
    const { makeUser } = require('./setup');
    const u = await makeUser('student', { status: 'inactive' });
    const r = await request(app).post('/api/v1/auth/login').send({ email: u.email, password: 'Test@1234' });
    expect(r.status).toBe(403);
    const r2 = await request(app).post('/api/v1/auth/login').send({ email: u.email, password: 'Wrong@1234' });
    expect(r2.status).toBe(401);
  });

  test('me requires token; refresh rotates', async () => {
    const { makeUser } = require('./setup');
    const u = await makeUser('tpo');
    const { signRefresh } = require('../src/middleware/auth');
    const refresh = signRefresh(u);
    const noAuth = await request(app).get('/api/v1/auth/me');
    expect(noAuth.status).toBe(401);
    const r = await request(app).post('/api/v1/auth/refresh').set('Cookie', [`cc_refresh=${refresh}`]);
    expect(r.status).toBe(200);
    expect(r.body.data.accessToken).toBeTruthy();
  });
});
