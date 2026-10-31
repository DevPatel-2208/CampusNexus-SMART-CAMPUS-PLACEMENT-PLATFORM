const request = require('supertest');
const app = require('../src/app');
const { makeUser, tokenFor } = require('./setup');
const StudentProfile = require('../src/models/StudentProfile');
const { StudentSkill, Skill } = require('../src/models/Skill');
const { Application } = require('../src/models/Application');
const { Job } = require('../src/models/Job');
const CompanyProfile = require('../src/models/CompanyProfile');

describe('Student AI Chatbot API & Personalization', () => {
  let studentA, studentB, companyUser, tpoUser;
  let tokenA, tokenB, tokenCompany, tokenTpo;

  beforeEach(async () => {
    studentA = await makeUser('student', { name: 'Aarav Sharma' });
    tokenA = tokenFor(studentA);

    studentB = await makeUser('student', { name: 'Priya Patel' });
    tokenB = tokenFor(studentB);

    companyUser = await makeUser('company', { name: 'Tech recruiter' });
    tokenCompany = tokenFor(companyUser);

    tpoUser = await makeUser('tpo', { name: 'Campus TPO' });
    tokenTpo = tokenFor(tpoUser);

    // Setup Student A's profile & skills
    await StudentProfile.create({
      user: studentA._id,
      enrollmentNo: 'EN1001',
      course: 'B.Tech',
      branch: 'Computer Science',
      semester: '7',
      cgpa: 8.85,
      backlogs: 0,
      profileCompletion: 90,
    });

    const skillReact = await Skill.create({ skillName: 'React.js', category: 'Frontend' });
    await StudentSkill.create({
      student: studentA._id,
      skill: skillReact._id,
      proficiency: 'Advanced',
    });

    // Setup Student B's profile
    await StudentProfile.create({
      user: studentB._id,
      enrollmentNo: 'EN2002',
      course: 'MCA',
      branch: 'Information Technology',
      semester: '3',
      cgpa: 7.20,
      backlogs: 1,
      profileCompletion: 65,
    });
  });

  test('GET /api/v1/student/chat/overview returns Student A specific greeting and profile', async () => {
    const res = await request(app)
      .get('/api/v1/student/chat/overview')
      .set('Authorization', `Bearer ${tokenA}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.studentName).toBe('Aarav Sharma');
    expect(res.body.data.firstName).toBe('Aarav');
    expect(res.body.data.welcomeMessage).toContain('Aarav');
    expect(res.body.data.profile.cgpa).toBe(8.85);
    expect(res.body.data.profile.branch).toBe('Computer Science');
    expect(res.body.data.suggestions).toBeDefined();
  });

  test('GET /api/v1/student/chat/overview dynamically switches to Student B profile', async () => {
    const res = await request(app)
      .get('/api/v1/student/chat/overview')
      .set('Authorization', `Bearer ${tokenB}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.studentName).toBe('Priya Patel');
    expect(res.body.data.firstName).toBe('Priya');
    expect(res.body.data.welcomeMessage).toContain('Priya');
    expect(res.body.data.profile.cgpa).toBe(7.2);
    expect(res.body.data.profile.branch).toBe('Information Technology');
  });

  test('POST /api/v1/student/chat personalizes response with student profile data', async () => {
    const res = await request(app)
      .post('/api/v1/student/chat')
      .set('Authorization', `Bearer ${tokenA}`)
      .send({ message: 'What is my current CGPA and profile status?' });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.reply).toContain('Aarav');
    expect(res.body.data.reply).toContain('8.85');
  });

  test('POST /api/v1/student/chat personalizes technical skills inquiry', async () => {
    const res = await request(app)
      .post('/api/v1/student/chat')
      .set('Authorization', `Bearer ${tokenA}`)
      .send({ message: 'What are my technical skills?' });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.reply).toContain('Aarav');
    expect(res.body.data.reply).toContain('React.js');
  });

  test('RBAC: Non-student roles (company/tpo) are forbidden from student chatbot', async () => {
    const resCompany = await request(app)
      .get('/api/v1/student/chat/overview')
      .set('Authorization', `Bearer ${tokenCompany}`);

    expect(resCompany.status).toBe(403);

    const resTpo = await request(app)
      .post('/api/v1/student/chat')
      .set('Authorization', `Bearer ${tokenTpo}`)
      .send({ message: 'Hello' });

    expect(resTpo.status).toBe(403);
  });

  test('Security: Unauthenticated requests are rejected with 401', async () => {
    const res = await request(app)
      .post('/api/v1/student/chat')
      .send({ message: 'Hello' });

    expect(res.status).toBe(401);
  });
});
