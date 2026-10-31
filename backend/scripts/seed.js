/**
 * CareerConnect — comprehensive professional demo seed.
 *
 * Creates realistic users (admin, TPO, 12 students, 8 companies), full student
 * profiles, a skills catalogue, jobs with required skills, applications with
 * status history, selections/offers/placements, placement drives, interviews,
 * assessments with questions, announcements, notifications, contacts, support
 * tickets and audit logs.
 *
 * Safe by design:
 *   - Refuses to run on a non-empty DB unless `--force` is passed.
 *   - With `--force` it clears ONLY the collections it manages, then reseeds.
 *
 * Usage:
 *   npm run seed -- --force
 *
 * All demo accounts use strong passwords (upper + lower + digit + symbol).
 */
const mongoose = require('mongoose');
const env = require('../src/config/env');
const { hashPassword } = require('../src/utils/crypto');

const User = require('../src/models/User');
const StudentProfile = require('../src/models/StudentProfile');
const CompanyProfile = require('../src/models/CompanyProfile');
const CompanyDocument = require('../src/models/CompanyDocument');
const { Job, JobSkill, SavedJob, JobAlert } = require('../src/models/Job');
const { PlacementDrive, DriveRegistration, Interview } = require('../src/models/Drive');
const { Application, Selection, Offer, Placement } = require('../src/models/Application');
const { Assessment, AssessmentQuestion, AssessmentAttempt, AssessmentAnswer, ExamViolation } = require('../src/models/Assessment');
const { Skill, StudentSkill } = require('../src/models/Skill');
const { Education, Project, Certification, Resume, CareerPreference, CareerRoadmap, SkillGap } = require('../src/models/Student');
const { Notification, Announcement, Contact, SupportTicket, AuditLog } = require('../src/models/Misc');

const DAY = 86400000;
const base = Date.now();
const at = (n) => new Date(base + n * DAY);

const MANAGED = [
  AuditLog, SupportTicket, Contact, Announcement, Notification,
  SkillGap, CareerRoadmap, CareerPreference, Resume, Certification, Project, Education,
  StudentSkill, Skill,
  ExamViolation, AssessmentAnswer, AssessmentAttempt, AssessmentQuestion, Assessment,
  Interview, DriveRegistration, PlacementDrive,
  Placement, Offer, Selection, Application, JobAlert, SavedJob, JobSkill, Job,
  CompanyDocument, CompanyProfile, StudentProfile, User,
];

/* ------------------------------------------------------------------ */
/* Data                                                                */
/* ------------------------------------------------------------------ */

const SKILLS = [
  ['JavaScript', 'Programming'], ['TypeScript', 'Programming'], ['React', 'Frontend'],
  ['Node.js', 'Backend'], ['Express.js', 'Backend'], ['MongoDB', 'Database'],
  ['SQL', 'Database'], ['Python', 'Programming'], ['Java', 'Programming'],
  ['Spring Boot', 'Backend'], ['Django', 'Backend'], ['REST APIs', 'Backend'],
  ['AWS', 'Cloud'], ['Docker', 'DevOps'], ['Git', 'Tools'], ['Data Structures', 'Core CS'],
  ['Algorithms', 'Core CS'], ['Machine Learning', 'Data & AI'], ['Data Analysis', 'Data & AI'],
  ['HTML/CSS', 'Frontend'], ['Tailwind CSS', 'Frontend'], ['Figma', 'Design'],
  ['Communication', 'Soft Skills'], ['Problem Solving', 'Soft Skills'], ['Cloud Computing', 'Cloud'],
];

const STUDENTS = [
  { name: 'Aarav Sharma', email: 'student@careerconnect.local', password: 'Student@123', phone: '+91 98250 11001', gender: 'Male', dob: '2004-03-12', course: 'B.Tech', branch: 'Computer Engineering', semester: '8', cgpa: 8.7, backlogs: 0, passingYear: 2026, city: 'Ahmedabad', enrollmentNo: 'ENR2022001', about: 'Final-year Computer Engineering student passionate about full-stack web development and scalable systems.', placed: true, skills: ['JavaScript', 'React', 'Node.js', 'MongoDB', 'Git', 'Problem Solving'] },
  { name: 'Isha Patel', email: 'isha.patel@careerconnect.local', password: 'Student@123', phone: '+91 98250 11002', gender: 'Female', dob: '2004-07-21', course: 'B.Tech', branch: 'Information Technology', semester: '8', cgpa: 9.1, backlogs: 0, passingYear: 2026, city: 'Ahmedabad', enrollmentNo: 'ENR2022002', about: 'IT undergraduate with a strong foundation in data structures and cloud technologies.', placed: true, skills: ['Java', 'Data Structures', 'Algorithms', 'SQL', 'AWS', 'Communication'] },
  { name: 'Rohan Mehta', email: 'rohan.mehta@careerconnect.local', password: 'Student@123', phone: '+91 98250 11003', gender: 'Male', dob: '2004-01-09', course: 'B.Tech', branch: 'Computer Engineering', semester: '8', cgpa: 7.8, backlogs: 0, passingYear: 2026, city: 'Surat', enrollmentNo: 'ENR2022003', about: 'Backend enthusiast building REST APIs with Node.js and Express.', placed: false, skills: ['Node.js', 'Express.js', 'REST APIs', 'MongoDB', 'Git'] },
  { name: 'Ananya Iyer', email: 'ananya.iyer@careerconnect.local', password: 'Student@123', phone: '+91 98250 11004', gender: 'Female', dob: '2002-11-30', course: 'MCA', branch: 'Computer Applications', semester: '4', cgpa: 8.9, backlogs: 0, passingYear: 2026, city: 'Bengaluru', enrollmentNo: 'ENR2022004', about: 'MCA student focused on machine learning and data-driven products.', placed: true, skills: ['Python', 'Machine Learning', 'Data Analysis', 'SQL', 'Communication'] },
  { name: 'Kabir Singh', email: 'kabir.singh@careerconnect.local', password: 'Student@123', phone: '+91 98250 11005', gender: 'Male', dob: '2004-05-18', course: 'B.Tech', branch: 'Electronics & Communication', semester: '8', cgpa: 7.2, backlogs: 1, passingYear: 2026, city: 'Jaipur', enrollmentNo: 'ENR2022005', about: 'ECE student with interest in embedded systems and cloud computing.', placed: false, skills: ['Python', 'Cloud Computing', 'Problem Solving', 'Git'] },
  { name: 'Diya Nair', email: 'diya.nair@careerconnect.local', password: 'Student@123', phone: '+91 98250 11006', gender: 'Female', dob: '2004-09-02', course: 'B.Tech', branch: 'Computer Engineering', semester: '8', cgpa: 9.3, backlogs: 0, passingYear: 2026, city: 'Kochi', enrollmentNo: 'ENR2022006', about: 'Topper with deep interest in algorithms and competitive programming.', placed: true, skills: ['JavaScript', 'React', 'TypeScript', 'Algorithms', 'Data Structures', 'Problem Solving'] },
  { name: 'Vivaan Gupta', email: 'vivaan.gupta@careerconnect.local', password: 'Student@123', phone: '+91 98250 11007', gender: 'Male', dob: '2003-12-14', course: 'B.Tech', branch: 'Mechanical Engineering', semester: '8', cgpa: 6.9, backlogs: 0, passingYear: 2026, city: 'Lucknow', enrollmentNo: 'ENR2022007', about: 'Mechanical engineering student exploring data analysis and operations roles.', placed: false, skills: ['Data Analysis', 'SQL', 'Communication'] },
  { name: 'Saanvi Reddy', email: 'saanvi.reddy@careerconnect.local', password: 'Student@123', phone: '+91 98250 11008', gender: 'Female', dob: '2002-06-25', course: 'MCA', branch: 'Computer Applications', semester: '4', cgpa: 8.4, backlogs: 0, passingYear: 2026, city: 'Hyderabad', enrollmentNo: 'ENR2022008', about: 'MCA student building full-stack applications with the MERN stack.', placed: false, skills: ['React', 'Node.js', 'Express.js', 'MongoDB', 'JavaScript'] },
  { name: 'Arjun Verma', email: 'arjun.verma@careerconnect.local', password: 'Student@123', phone: '+91 98250 11009', gender: 'Male', dob: '2004-02-08', course: 'B.Tech', branch: 'Computer Engineering', semester: '8', cgpa: 8.1, backlogs: 0, passingYear: 2026, city: 'Pune', enrollmentNo: 'ENR2022009', about: 'Aspiring DevOps engineer with hands-on Docker and AWS experience.', placed: false, skills: ['Docker', 'AWS', 'Git', 'Cloud Computing', 'Problem Solving'] },
  { name: 'Myra Joshi', email: 'myra.joshi@careerconnect.local', password: 'Student@123', phone: '+91 98250 11010', gender: 'Female', dob: '2004-04-16', course: 'B.Tech', branch: 'Information Technology', semester: '8', cgpa: 8.6, backlogs: 0, passingYear: 2026, city: 'Nagpur', enrollmentNo: 'ENR2022010', about: 'IT student passionate about UI/UX and front-end engineering.', placed: true, skills: ['HTML/CSS', 'Tailwind CSS', 'React', 'Figma', 'JavaScript'] },
  { name: 'Aditya Kulkarni', email: 'aditya.kulkarni@careerconnect.local', password: 'Student@123', phone: '+91 98250 11011', gender: 'Male', dob: '2004-08-27', course: 'B.Tech', branch: 'Computer Engineering', semester: '8', cgpa: 7.5, backlogs: 0, passingYear: 2026, city: 'Mumbai', enrollmentNo: 'ENR2022011', about: 'Full-stack learner who enjoys shipping end-to-end features.', placed: false, skills: ['JavaScript', 'React', 'Node.js', 'SQL', 'Git'] },
  { name: 'Riya Desai', email: 'riya.desai@careerconnect.local', password: 'Student@123', phone: '+91 98250 11012', gender: 'Female', dob: '2004-10-05', course: 'B.Tech', branch: 'Computer Engineering', semester: '8', cgpa: 9.0, backlogs: 0, passingYear: 2026, city: 'Vadodara', enrollmentNo: 'ENR2022012', about: 'Backend developer with strong Java and Spring Boot fundamentals.', placed: true, skills: ['Java', 'Spring Boot', 'SQL', 'REST APIs', 'Communication'] },
];

const COMPANIES = [
  { name: 'NovaTech Solutions', email: 'company@careerconnect.local', password: 'Company@123', industry: 'Information Technology', website: 'https://novatech.example.com', city: 'Bengaluru', address: '14th Floor, Tech Park One, Bengaluru 560103', description: 'A product engineering company delivering cloud-native platforms for global enterprises.', verificationStatus: 'verified' },
  { name: 'BlueOrbit Systems', email: 'hr@blueorbit.example.com', password: 'Company@123', industry: 'Software Product', website: 'https://blueorbit.example.com', city: 'Pune', address: 'Tower B, Cyber City, Hinjawadi, Pune 411057', description: 'Builds observability and developer tooling used by high-growth startups.', verificationStatus: 'verified' },
  { name: 'DataWeave Analytics', email: 'careers@dataweave.example.com', password: 'Company@123', industry: 'Data & AI', website: 'https://dataweave.example.com', city: 'Hyderabad', address: 'Plot 22, HITEC City, Hyderabad 500081', description: 'An analytics consultancy turning data into decision intelligence for enterprises.', verificationStatus: 'verified' },
  { name: 'CloudNest Technologies', email: 'talent@cloudnest.example.com', password: 'Company@123', industry: 'Cloud Services', website: 'https://cloudnest.example.com', city: 'Ahmedabad', address: 'Titanium One, Prahlad Nagar, Ahmedabad 380015', description: 'A cloud consultancy specialising in AWS migrations and platform reliability.', verificationStatus: 'verified' },
  { name: 'Vertex Financial', email: 'people@vertexfin.example.com', password: 'Company@123', industry: 'FinTech', website: 'https://vertexfin.example.com', city: 'Mumbai', address: 'One BKC, Bandra Kurla Complex, Mumbai 400051', description: 'Digital lending and wealth platform serving millions of customers.', verificationStatus: 'verified' },
  { name: 'PixelForge Studios', email: 'jobs@pixelforge.example.com', password: 'Company@123', industry: 'Design & Media', website: 'https://pixelforge.example.com', city: 'Remote', address: 'Fully distributed team', description: 'A design-led studio crafting brand and product experiences for modern teams.', verificationStatus: 'verified' },
  { name: 'QuantumEdge Robotics', email: 'recruit@quantumedge.example.com', password: 'Company@123', industry: 'Robotics & Hardware', website: 'https://quantumedge.example.com', city: 'Chennai', address: 'Industrial Estate, Guindy, Chennai 600032', description: 'Automation and robotics systems for smart manufacturing.', verificationStatus: 'verified' },
  { name: 'GreenGrid Energy', email: 'hr@greengrid.example.com', password: 'Company@123', industry: 'Renewable Energy', website: 'https://greengrid.example.com', city: 'New Delhi', address: 'Nehru Place, New Delhi 110019', description: 'Solar and grid-scale storage projects powering a cleaner tomorrow.', verificationStatus: 'pending' },
];

const JOBS = [
  { company: 'NovaTech Solutions', title: 'Full Stack Developer (MERN)', jobType: 'Full Time', workMode: 'Hybrid', location: 'Bengaluru', salaryMin: 650000, salaryMax: 950000, experience: 'Fresher', qualification: 'B.Tech / MCA', vacancies: 6, skills: ['React', 'Node.js', 'MongoDB', 'JavaScript', 'REST APIs'], description: 'Design, build and ship MERN features end-to-end. You will own REST APIs, React interfaces and MongoDB data models in an agile squad.' },
  { company: 'NovaTech Solutions', title: 'Frontend Engineer - React', jobType: 'Full Time', workMode: 'Remote', location: 'Remote', salaryMin: 600000, salaryMax: 850000, experience: 'Fresher', qualification: 'B.Tech / BCA / MCA', vacancies: 4, skills: ['React', 'JavaScript', 'HTML/CSS', 'TypeScript', 'Git'], description: 'Build accessible, performant React interfaces and a reusable component library for our design system.' },
  { company: 'BlueOrbit Systems', title: 'Backend Engineer - Node.js', jobType: 'Full Time', workMode: 'Hybrid', location: 'Pune', salaryMin: 700000, salaryMax: 1100000, experience: 'Experienced', qualification: 'B.Tech / MCA', vacancies: 3, skills: ['Node.js', 'Express.js', 'MongoDB', 'Docker', 'REST APIs'], description: 'Own scalable Node.js services powering our observability platform, with a focus on reliability and performance.' },
  { company: 'DataWeave Analytics', title: 'Data Analyst Intern', jobType: 'Internship', workMode: 'Onsite', location: 'Hyderabad', stipend: '₹25,000 / month', internshipDuration: '6 months', salaryMin: null, salaryMax: null, experience: 'Fresher', qualification: 'B.Tech / MCA', vacancies: 5, skills: ['SQL', 'Python', 'Data Analysis', 'Communication'], description: 'Support delivery teams with data cleaning, dashboarding and analytical storytelling for enterprise clients.' },
  { company: 'DataWeave Analytics', title: 'Machine Learning Engineer', jobType: 'Full Time', workMode: 'Hybrid', location: 'Hyderabad', salaryMin: 900000, salaryMax: 1400000, experience: 'Experienced', qualification: 'M.Tech / MCA', vacancies: 2, skills: ['Python', 'Machine Learning', 'Data Analysis', 'AWS'], description: 'Develop and deploy ML models for forecasting and recommendation use-cases at scale.' },
  { company: 'CloudNest Technologies', title: 'Cloud Engineer (AWS)', jobType: 'Full Time', workMode: 'Onsite', location: 'Ahmedabad', salaryMin: 700000, salaryMax: 1000000, experience: 'Fresher', qualification: 'B.Tech', vacancies: 4, skills: ['AWS', 'Docker', 'Cloud Computing', 'Git'], description: 'Help customers migrate workloads to AWS and build resilient, well-architected cloud platforms.' },
  { company: 'CloudNest Technologies', title: 'DevOps Trainee', jobType: 'Internship', workMode: 'Hybrid', location: 'Ahmedabad', stipend: '₹20,000 / month', internshipDuration: '6 months', experience: 'Fresher', qualification: 'B.Tech', vacancies: 3, skills: ['Docker', 'AWS', 'Git', 'Problem Solving'], description: 'Learn CI/CD, containerisation and infrastructure automation on real customer engagements.' },
  { company: 'Vertex Financial', title: 'Java Backend Developer', jobType: 'Full Time', workMode: 'Onsite', location: 'Mumbai', salaryMin: 800000, salaryMax: 1200000, experience: 'Fresher', qualification: 'B.Tech / MCA', vacancies: 5, skills: ['Java', 'Spring Boot', 'SQL', 'REST APIs'], description: 'Build secure, high-throughput services for our digital lending platform using Java and Spring Boot.' },
  { company: 'Vertex Financial', title: 'Software Engineer - Payments', jobType: 'Full Time', workMode: 'Hybrid', location: 'Mumbai', salaryMin: 900000, salaryMax: 1300000, experience: 'Experienced', qualification: 'B.Tech / MCA', vacancies: 2, skills: ['Java', 'SQL', 'REST APIs', 'Problem Solving'], description: 'Engineer resilient payment flows and reconciliation pipelines handling millions of transactions.' },
  { company: 'PixelForge Studios', title: 'UI/UX Designer', jobType: 'Full Time', workMode: 'Remote', location: 'Remote', salaryMin: 550000, salaryMax: 900000, experience: 'Fresher', qualification: 'Any Graduate', vacancies: 2, skills: ['Figma', 'HTML/CSS', 'Communication', 'Problem Solving'], description: 'Shape delightful product experiences — from research and wireframes to polished, developer-ready designs.' },
  { company: 'PixelForge Studios', title: 'Frontend Developer - Design Systems', jobType: 'Full Time', workMode: 'Remote', location: 'Remote', salaryMin: 650000, salaryMax: 950000, experience: 'Fresher', qualification: 'B.Tech / BCA', vacancies: 2, skills: ['React', 'TypeScript', 'Tailwind CSS', 'HTML/CSS'], description: 'Translate design tokens into a robust, accessible component library used across client products.' },
  { company: 'QuantumEdge Robotics', title: 'Software Engineer - Robotics', jobType: 'Full Time', workMode: 'Onsite', location: 'Chennai', salaryMin: 700000, salaryMax: 1050000, experience: 'Fresher', qualification: 'B.Tech ECE / CSE', vacancies: 3, skills: ['Python', 'Algorithms', 'Data Structures', 'Problem Solving'], description: 'Develop control and perception software for industrial automation robots.' },
  { company: 'GreenGrid Energy', title: 'Graduate Engineer Trainee', jobType: 'Fresher', workMode: 'Onsite', location: 'New Delhi', salaryMin: 450000, salaryMax: 650000, experience: 'Fresher', qualification: 'B.Tech', vacancies: 8, skills: ['Communication', 'Problem Solving', 'Data Analysis'], description: 'Rotational programme across projects, operations and analytics within our renewable energy portfolio.' },
  { company: 'GreenGrid Energy', title: 'Data Analyst - Operations', jobType: 'Full Time', workMode: 'Hybrid', location: 'New Delhi', salaryMin: 600000, salaryMax: 850000, experience: 'Fresher', qualification: 'B.Tech / MCA', vacancies: 2, skills: ['SQL', 'Python', 'Data Analysis', 'Communication'], description: 'Analyse generation and maintenance data to improve the reliability of solar assets.' },
];

const CERT_NAMES = [
  ['AWS Certified Cloud Practitioner', 'Amazon Web Services'],
  ['Meta Front-End Developer', 'Meta'],
  ['MongoDB Associate Developer', 'MongoDB University'],
  ['Google Data Analytics', 'Google'],
  ['Oracle Java Foundations', 'Oracle'],
  ['Docker Essentials', 'Docker Inc.'],
];

/* ------------------------------------------------------------------ */
/* Helpers                                                             */
/* ------------------------------------------------------------------ */

function pick(arr, i) { return arr[i % arr.length]; }

async function clearManaged() {
  for (const Model of MANAGED) {
    try { await Model.deleteMany({}); } catch (e) { /* ignore */ }
  }
}

/* ------------------------------------------------------------------ */
/* Main                                                                */
/* ------------------------------------------------------------------ */

async function main() {
  const force = process.argv.includes('--force');
  if (!env.ALLOW_SEED && !force) { console.error('Set ALLOW_SEED=true or pass --force to seed.'); process.exit(1); }

  await mongoose.connect(process.env.MONGO_URI || env.MONGO_URI);
  console.log('Connected to', mongoose.connection.name);

  const existing = await User.countDocuments();
  if (existing > 0 && !force) {
    console.error(`Database already has ${existing} users. Re-run with --force to reset demo data.`);
    await mongoose.disconnect();
    process.exit(1);
  }
  if (force) { console.log('Clearing managed collections…'); await clearManaged(); }

  const pw = {};
  const passwordFor = async (plain) => {
    if (!pw[plain]) pw[plain] = await hashPassword(plain);
    return pw[plain];
  };

  /* ------- Users ------- */
  const tpo1 = await User.create({ name: 'Dr. Anita Rao', email: 'tpo@careerconnect.local', password: await passwordFor('Tpo@12345'), role: 'tpo', status: 'active', emailVerifiedAt: at(-110) });
  const tpo2 = await User.create({ name: 'Prof. Sanjay Bhatt', email: 'tpo2@careerconnect.local', password: await passwordFor('Tpo@12345'), role: 'tpo', status: 'active', emailVerifiedAt: at(-90) });

  const studentUsers = [];
  const studentProfiles = [];
  for (const s of STUDENTS) {
    const u = await User.create({ name: s.name, email: s.email, password: await passwordFor(s.password), role: 'student', status: 'active', emailVerifiedAt: at(-100) });
    studentUsers.push(u);
    const profile = new StudentProfile({
      user: u._id, enrollmentNo: s.enrollmentNo, phone: s.phone, dob: new Date(s.dob), gender: s.gender,
      address: `${s.city}`, city: s.city, course: s.course, branch: s.branch, semester: s.semester,
      cgpa: s.cgpa, passingYear: s.passingYear, backlogs: s.backlogs,
      placementStatus: s.placed ? 'placed' : 'not_placed', about: s.about,
    });
    profile.recalcCompletion();
    await profile.save();
    studentProfiles.push(profile);
  }

  const companyUsers = [];
  const companyProfiles = [];
  const companyByKey = {};
  for (const c of COMPANIES) {
    const u = await User.create({ name: c.name, email: c.email, password: await passwordFor(c.password), role: 'company', status: 'active', emailVerifiedAt: at(-95) });
    companyUsers.push(u);
    const cp = await CompanyProfile.create({
      user: u._id, companyName: c.name, industry: c.industry, website: c.website,
      email: c.email, phone: '+91 80 4000 1000', address: c.address, city: c.city,
      description: c.description, verificationStatus: c.verificationStatus,
    });
    companyProfiles.push(cp);
    companyByKey[c.name] = cp;
  }

  /* ------- Company documents ------- */
  for (const name of ['NovaTech Solutions', 'BlueOrbit Systems', 'Vertex Financial']) {
    const cp = companyByKey[name];
    const slug = name.toLowerCase().replace(/[^a-z]+/g, '-');
    await CompanyDocument.create({ company: cp._id, documentType: 'Registration', documentName: `${name} - Incorporation Certificate.pdf`, documentPath: `uploads/demo/${slug}-incorporation.pdf` });
    await CompanyDocument.create({ company: cp._id, documentType: 'GST', documentName: `${name} - GST Certificate.pdf`, documentPath: `uploads/demo/${slug}-gst.pdf` });
  }

  /* ------- Skills catalogue ------- */
  const skillByName = {};
  for (const [skillName, category] of SKILLS) {
    skillByName[skillName] = await Skill.create({ skillName, category });
  }

  /* ------- Student skills ------- */
  for (let i = 0; i < studentUsers.length; i++) {
    const s = STUDENTS[i];
    const levels = ['Beginner', 'Intermediate', 'Advanced', 'Expert'];
    for (let k = 0; k < s.skills.length; k++) {
      const skill = skillByName[s.skills[k]];
      if (!skill) continue;
      await StudentSkill.create({ student: studentUsers[i]._id, skill: skill._id, proficiency: levels[(i + k) % levels.length] });
    }
  }

  /* ------- Education / Projects / Certifications / Resume / Preferences ------- */
  for (let i = 0; i < studentUsers.length; i++) {
    const s = STUDENTS[i];
    const uid = studentUsers[i]._id;
    await Education.create({ student: uid, qualification: '10th', institute: `${s.city} Public School`, board: 'CBSE', passingYear: s.passingYear - 6, percentage: 88 + (i % 8) });
    await Education.create({ student: uid, qualification: '12th', institute: `${s.city} Senior Secondary School`, board: 'CBSE', stream: 'Science (PCM)', passingYear: s.passingYear - 4, percentage: 82 + (i % 10) });
    await Education.create({ student: uid, qualification: s.course === 'MCA' ? 'Post Graduation' : 'Graduation', institute: 'Gujarat Technological University', university: 'GTU', course: s.course, branch: s.branch, passingYear: s.passingYear, cgpa: s.cgpa });

    const stack = s.skills.slice(0, 3).join(', ');
    await Project.create({ student: uid, title: `${s.branch.split(' ')[0]} Capstone Project`, description: `A full project applying ${stack} to solve a real-world problem.`, technologies: stack, githubUrl: `https://github.com/${s.email.split('@')[0]}/capstone` });
    if (i % 2 === 0) {
      await Project.create({ student: uid, title: 'Personal Portfolio Website', description: 'Responsive personal portfolio showcasing projects and skills.', technologies: 'HTML/CSS, JavaScript', projectUrl: `https://${s.email.split('@')[0]}.example.com` });
    }

    const cert = pick(CERT_NAMES, i);
    await Certification.create({ student: uid, name: cert[0], issuingOrganization: cert[1], issueDate: at(-180 + i * 5) });
    if (i % 3 === 0) {
      const cert2 = pick(CERT_NAMES, i + 3);
      await Certification.create({ student: uid, name: cert2[0], issuingOrganization: cert2[1], issueDate: at(-90 + i * 3) });
    }

    await Resume.create({ student: uid, fileName: `${s.name.replace(/\s+/g, '_')}_Resume.pdf`, filePath: `uploads/demo/${s.enrollmentNo}-resume.pdf`, fileType: 'application/pdf', fileSize: 182000 + i * 1200 });

    await CareerPreference.create({ student: uid, preferredRole: s.skills[0] === 'Java' ? 'Backend Developer' : 'Software Engineer', preferredLocation: s.city, preferredJobType: 'Full Time', expectedSalary: `${6 + (i % 4)} LPA`, workMode: i % 2 ? 'Hybrid' : 'Onsite', experienceLevel: 'Fresher' });
  }

  /* ------- Jobs + required skills ------- */
  const jobs = [];
  for (let i = 0; i < JOBS.length; i++) {
    const j = JOBS[i];
    const cp = companyByKey[j.company];
    const created = await Job.create({
      company: cp._id, title: j.title, description: j.description, qualification: j.qualification,
      experience: j.experience, salaryMin: j.salaryMin, salaryMax: j.salaryMax, location: j.location,
      jobType: j.jobType, workMode: j.workMode, vacancies: j.vacancies,
      internshipDuration: j.internshipDuration || null, stipend: j.stipend || null,
      deadline: at(20 + i * 3), status: 'Open', approvalStatus: 'approved',
    });
    jobs.push(created);
    for (const skillName of j.skills) {
      const skill = skillByName[skillName];
      if (skill) await JobSkill.create({ job: created._id, skill: skill._id, isRequired: true });
    }
  }
  // one pending job awaiting TPO approval
  await Job.create({
    company: companyByKey['GreenGrid Energy']._id, title: 'Sustainability Analyst', description: 'Analyse ESG and emissions data to support sustainability reporting.', qualification: 'B.Tech / MBA', experience: 'Fresher',
    salaryMin: 550000, salaryMax: 800000, location: 'New Delhi', jobType: 'Full Time', workMode: 'Onsite', vacancies: 2, deadline: at(45), status: 'Open', approvalStatus: 'pending',
  });

  /* ------- Saved jobs + alerts (demo student) ------- */
  await SavedJob.create({ student: studentUsers[0]._id, job: jobs[1]._id });
  await SavedJob.create({ student: studentUsers[0]._id, job: jobs[5]._id });
  await JobAlert.create({ student: studentUsers[0]._id, roleKeyword: 'Full Stack Developer', location: 'Bengaluru', minSalary: 600000, isActive: true });
  await JobAlert.create({ student: studentUsers[2]._id, roleKeyword: 'Backend Engineer', location: '', minSalary: 500000, isActive: true });

  /* ------- Applications (+ history) ------- */
  const statusFlow = ['Applied', 'Under Review', 'Shortlisted', 'Interview'];
  const applications = [];
  const usedPairs = new Set();
  const addApp = async (studentIdx, jobIdx, status, opts = {}) => {
    const key = `${studentIdx}:${jobIdx}`;
    if (usedPairs.has(key)) return null;
    usedPairs.add(key);
    const upto = statusFlow.indexOf(status);
    const history = [{ status: 'Applied', note: 'Application submitted', by: studentUsers[studentIdx]._id, at: at(-30 + studentIdx) }];
    for (let k = 1; k <= (upto > 0 ? upto : 0); k++) {
      history.push({ status: statusFlow[k], note: `${statusFlow[k]} by ${JOBS[jobIdx].company}`, by: companyUsers[0]._id, at: at(-25 + studentIdx + k) });
    }
    const doc = await Application.create({
      student: studentUsers[studentIdx]._id,
      job: jobs[jobIdx]._id,
      status,
      coverLetter: opts.coverLetter || `I am excited to apply for the ${JOBS[jobIdx].title} role at ${JOBS[jobIdx].company}. My background in ${STUDENTS[studentIdx].skills.slice(0, 2).join(' and ')} aligns well with this position.`,
      rejectionReason: opts.rejectionReason || null,
      history,
      appliedAt: at(-30 + studentIdx),
    });
    applications.push({ doc, studentIdx, jobIdx });
    return doc;
  };

  // Placed students -> Selected/Placed
  const placedIdx = [0, 1, 3, 5, 9, 11];
  const placedJob = { 0: 0, 1: 7, 3: 4, 5: 1, 9: 10, 11: 7 };
  for (const si of placedIdx) {
    await addApp(si, placedJob[si], 'Placed', { coverLetter: `I am thrilled to apply for this role and believe my ${STUDENTS[si].branch} background is a strong fit.` });
    // a couple of extra earlier applications with other statuses
    await addApp(si, (placedJob[si] + 3) % jobs.length, 'Rejected', { rejectionReason: 'Position filled by an internal candidate.' });
    if (si % 2 === 0) await addApp(si, (placedJob[si] + 5) % jobs.length, 'Shortlisted');
  }
  // Non-placed students -> pipeline statuses
  const activeIdx = [2, 4, 6, 7, 8, 10];
  const statuses = ['Applied', 'Under Review', 'Shortlisted', 'Interview'];
  for (let n = 0; n < activeIdx.length; n++) {
    const si = activeIdx[n];
    await addApp(si, n % jobs.length, statuses[n % statuses.length]);
    await addApp(si, (n + 4) % jobs.length, statuses[(n + 2) % statuses.length]);
    if (n % 2 === 0) await addApp(si, (n + 8) % jobs.length, 'Rejected', { rejectionReason: 'Profile does not meet the minimum CGPA criteria.' });
  }

  /* ------- Selections / Offers / Placements ------- */
  const selections = {};
  for (const si of placedIdx) {
    const appRec = applications.find((a) => a.studentIdx === si && a.doc.status === 'Placed');
    if (!appRec) continue;
    const jobIdx = appRec.jobIdx;
    const cp = companyByKey[JOBS[jobIdx].company];
    const sel = await Selection.create({ application: appRec.doc._id, company: cp._id, student: studentUsers[si]._id, selectionStatus: 'Selected', remarks: 'Cleared all interview rounds. Strong technical fundamentals.' });
    selections[si] = sel;
    const offer = await Offer.create({
      selection: sel._id, student: studentUsers[si]._id, company: cp._id, job: jobs[jobIdx]._id,
      position: JOBS[jobIdx].title,
      salary: `${(JOBS[jobIdx].salaryMin ? JOBS[jobIdx].salaryMin / 100000 : 6).toFixed(1)} LPA`,
      joiningDate: at(75), location: JOBS[jobIdx].location,
      employmentType: 'Full Time', offerExpiry: at(20), issueDate: at(-5), status: 'accepted',
    });
    await Placement.create({
      student: studentUsers[si]._id, company: cp._id, job: jobs[jobIdx]._id, offer: offer._id,
      position: JOBS[jobIdx].title,
      package: offer.salary, joiningDate: at(75), location: JOBS[jobIdx].location,
      placementDate: at(-3), status: 'Placed',
    });
  }
  // One pending offer (not yet accepted) for a non-placed student
  const pendingApp = applications.find((a) => a.doc.status === 'Shortlisted');
  if (pendingApp) {
    const cp = companyByKey[JOBS[pendingApp.jobIdx].company];
    await Offer.create({
      student: studentUsers[pendingApp.studentIdx]._id, company: cp._id, job: jobs[pendingApp.jobIdx]._id,
      position: JOBS[pendingApp.jobIdx].title, salary: '6.5 LPA', joiningDate: at(80), location: JOBS[pendingApp.jobIdx].location,
      employmentType: 'Full Time', offerExpiry: at(25), issueDate: at(-2), status: 'pending',
    });
  }

  /* ------- Interviews ------- */
  let ivCount = 0;
  for (const si of placedIdx) {
    const appRec = applications.find((a) => a.studentIdx === si && a.doc.status === 'Placed');
    if (!appRec) continue;
    const cp = companyByKey[JOBS[appRec.jobIdx].company];
    await Interview.create({ application: appRec.doc._id, company: cp._id, student: studentUsers[si]._id, roundName: 'Technical Round', interviewDate: at(-10 + ivCount), interviewTime: '10:30', mode: 'Online', meetingLink: 'https://meet.example.com/cc-technical', interviewer: 'Engineering Panel', status: 'completed', result: 'Selected' });
    await Interview.create({ application: appRec.doc._id, company: cp._id, student: studentUsers[si]._id, roundName: 'HR Round', interviewDate: at(-6 + ivCount), interviewTime: '14:00', mode: 'Offline', location: `${cp.city} Office`, interviewer: 'HR Team', status: 'completed', result: 'Selected' });
    ivCount++;
  }
  // Upcoming scheduled interviews for pipeline candidates
  for (const rec of applications.filter((a) => a.doc.status === 'Interview')) {
    const cp = companyByKey[JOBS[rec.jobIdx].company];
    await Interview.create({ application: rec.doc._id, company: cp._id, student: studentUsers[rec.studentIdx]._id, roundName: 'Technical Round', interviewDate: at(3 + ivCount), interviewTime: '11:00', mode: 'Online', meetingLink: 'https://meet.example.com/cc-upcoming', interviewer: 'Hiring Panel', notes: 'Please join 5 minutes early with a valid ID.', status: 'scheduled', result: 'Pending' });
    ivCount++;
  }

  /* ------- Placement drives ------- */
  const driveDefs = [
    { company: 'NovaTech Solutions', title: 'NovaTech Campus Drive 2026', date: at(12), mode: 'Offline', venue: 'Campus Placement Cell, Block A', status: 'registration_open', jobIdx: 0, minCgpa: 7.0, branches: 'Computer Engineering, Information Technology' },
    { company: 'Vertex Financial', title: 'Vertex Financial Hiring Drive', date: at(20), mode: 'Hybrid', venue: 'Virtual + Mumbai Office', status: 'upcoming', jobIdx: 7, minCgpa: 7.5, branches: 'Computer Engineering, MCA' },
    { company: 'CloudNest Technologies', title: 'CloudNest Cloud Engineer Drive', date: at(-8), mode: 'Offline', venue: 'CloudNest HQ, Ahmedabad', status: 'completed', jobIdx: 5, minCgpa: 6.5, branches: 'Computer Engineering' },
    { company: 'DataWeave Analytics', title: 'DataWeave Analytics Internship Drive', date: at(6), mode: 'Online', venue: 'Online assessment + interviews', status: 'registration_open', jobIdx: 3, minCgpa: 7.0, branches: 'MCA, Computer Engineering' },
  ];
  const drives = [];
  for (const d of driveDefs) {
    const cp = companyByKey[d.company];
    const drive = await PlacementDrive.create({
      company: cp._id, job: jobs[d.jobIdx]._id, driveTitle: d.title,
      driveType: 'Campus Placement', description: `${d.company} is visiting campus for the ${JOBS[d.jobIdx].title} role. Shortlisted candidates will go through an aptitude test followed by technical and HR rounds.`,
      driveDate: d.date, startTime: '09:30', endTime: '17:00',
      registrationStart: at(-20), registrationEnd: at(d.date > new Date() ? 3 : -10),
      venue: d.venue, mode: d.mode, status: d.status, maxStudents: 120, createdBy: tpo1._id,
      eligibility: { minCgpa: d.minCgpa, maxBacklogs: 1, allowedBranches: d.branches, allowedCourses: 'B.Tech, MCA', passingYear: 2026, requiredExperience: 'Fresher', requiredSkills: null },
    });
    drives.push(drive);
  }
  // Drive registrations
  for (let di = 0; di < drives.length; di++) {
    const drive = drives[di];
    const eligible = studentProfiles.filter((p) => (p.cgpa || 0) >= (drive.eligibility.minCgpa || 0)).slice(0, 6);
    for (let k = 0; k < eligible.length; k++) {
      await DriveRegistration.create({ drive: drive._id, student: eligible[k].user, eligibilityStatus: 'eligible', status: drive.status === 'completed' ? (k % 3 === 0 ? 'selected' : 'registered') : 'registered' });
    }
  }

  /* ------- Assessments ------- */
  const assessmentDefs = [
    { company: 'NovaTech Solutions', title: 'NovaTech Aptitude + Technical Test', jobIdx: 0, duration: 45, total: 50, perQ: 2, n: 25, difficulty: 'Mixed', categories: 'Aptitude, Technical', tech: 'MERN' },
    { company: 'Vertex Financial', title: 'Vertex Java Fundamentals Test', jobIdx: 7, duration: 40, total: 40, perQ: 2, n: 20, difficulty: 'Medium', categories: 'Technical', tech: 'Java, Spring Boot' },
    { company: 'DataWeave Analytics', title: 'DataWeave Analytical Reasoning', jobIdx: 3, duration: 30, total: 30, perQ: 2, n: 15, difficulty: 'Medium', categories: 'Aptitude, Logical Reasoning', tech: 'Data Analysis' },
  ];
  const questionsBank = [
    { question: 'Which data structure uses FIFO ordering?', type: 'MCQ', A: 'Stack', B: 'Queue', C: 'Tree', D: 'Graph', answer: 'B' },
    { question: 'In React, which hook manages local component state?', type: 'MCQ', A: 'useEffect', B: 'useMemo', C: 'useState', D: 'useRef', answer: 'C' },
    { question: 'What does SQL JOIN primarily do?', type: 'MCQ', A: 'Deletes rows', B: 'Combines rows from two tables', C: 'Sorts rows', D: 'Creates indexes', answer: 'B' },
    { question: 'Time complexity of binary search on a sorted array?', type: 'MCQ', A: 'O(n)', B: 'O(n log n)', C: 'O(log n)', D: 'O(1)', answer: 'C' },
    { question: 'Which HTTP status indicates a successful resource creation?', type: 'MCQ', A: '200', B: '201', C: '204', D: '302', answer: 'B' },
    { question: 'In MongoDB, which method inserts a single document?', type: 'MCQ', A: 'insertOne()', B: 'addOne()', C: 'create()', D: 'push()', answer: 'A' },
    { question: 'Which keyword defines a constant in JavaScript?', type: 'MCQ', A: 'var', B: 'let', C: 'const', D: 'static', answer: 'C' },
    { question: 'What is the primary role of Docker?', type: 'MCQ', A: 'Database engine', B: 'Containerisation', C: 'Web server', D: 'Version control', answer: 'B' },
  ];
  const assessments = [];
  for (const a of assessmentDefs) {
    const cp = companyByKey[a.company];
    const asmt = await Assessment.create({
      company: cp._id, job: jobs[a.jobIdx]._id, title: a.title,
      description: `Online proctored assessment for ${a.company}. Please attempt in a quiet environment.`,
      durationMinutes: a.duration, totalMarks: a.total, marksPerQuestion: a.perQ, numQuestions: a.n,
      difficulty: a.difficulty, categories: a.categories, technology: a.tech,
      passingPercentage: 60, negativeMarking: false, status: 'active',
    });
    assessments.push(asmt);
    for (let k = 0; k < Math.min(a.n, questionsBank.length); k++) {
      const q = questionsBank[(k + assessments.length) % questionsBank.length];
      await AssessmentQuestion.create({ assessment: asmt._id, question: q.question, questionType: q.type, optionA: q.A, optionB: q.B, optionC: q.C, optionD: q.D, correctAnswer: q.answer, marks: a.perQ });
    }
  }
  // Submitted attempt for the demo student
  const attemptQs = await AssessmentQuestion.find({ assessment: assessments[0]._id }).limit(5);
  const attempt = await AssessmentAttempt.create({
    assessment: assessments[0]._id, student: studentUsers[0]._id, startedAt: at(-4),
    submittedAt: at(-4), score: attemptQs.length * 2, percentage: 72, result: 'Passed', status: 'submitted', integrityStatus: 'SUBMITTED',
    expiresAt: at(-4), lastActivityAt: at(-4), lastHeartbeatAt: at(-4),
  });
  for (const q of attemptQs) {
    await AssessmentAnswer.create({ attempt: attempt._id, question: q._id, selectedAnswer: q.correctAnswer, isCorrect: true, marksObtained: 2 });
  }

  /* ------- Announcements ------- */
  const announcements = [
    { title: 'NovaTech Campus Drive — Registration Open', message: 'Registrations for the NovaTech Solutions campus drive are now open. Eligible students (CGPA ≥ 7.0) should register before the deadline.', targetRole: 'student', status: 'active', publishDate: at(-2) },
    { title: 'Resume Building Workshop', message: 'A hands-on resume building workshop will be held in the seminar hall this Friday at 3 PM. Bring your updated resume.', targetRole: 'student', status: 'active', publishDate: at(-6) },
    { title: 'Company Verification Reminder', message: 'Companies with pending verification must upload GST and incorporation documents to be eligible for drives.', targetRole: 'company', status: 'active', publishDate: at(-4) },
    { title: 'Placement Statistics Q3 Published', message: 'The quarterly placement statistics report is now available. Access it from the Reports section.', targetRole: 'all', status: 'active', publishDate: at(-10) },
  ];
  for (const a of announcements) {
    await Announcement.create({ createdBy: tpo1._id, title: a.title, message: a.message, targetRole: a.targetRole, publishDate: a.publishDate, status: a.status, publishedAt: a.publishDate });
  }

  /* ------- Notifications ------- */
  const notif = [
    { user: studentUsers[0]._id, title: 'Application shortlisted', message: 'Your application for Full Stack Developer (MERN) at NovaTech Solutions has been shortlisted.', type: 'application', actionUrl: '/student/applications', isRead: false, priority: 'high' },
    { user: studentUsers[0]._id, title: 'Interview scheduled', message: 'Technical Round scheduled with NovaTech Solutions. Please check the interview details.', type: 'interview', actionUrl: '/student/interviews', isRead: false, priority: 'high' },
    { user: studentUsers[0]._id, title: 'Offer released', message: 'Congratulations! You have received an offer from NovaTech Solutions.', type: 'offer', actionUrl: '/student/offers', isRead: false, priority: 'high' },
    { user: studentUsers[0]._id, title: 'New job matching your alert', message: 'A new Frontend Engineer role matches your job alert.', type: 'job', actionUrl: '/student/jobs', isRead: true, priority: 'normal' },
    { user: studentUsers[0]._id, title: 'Profile strength improved', message: 'Your profile is now 100% complete. Great job!', type: 'profile', actionUrl: '/student/profile', isRead: true, priority: 'low' },
    { user: studentUsers[2]._id, title: 'New recommended jobs', message: 'We found 6 new jobs matching your skills.', type: 'job', actionUrl: '/student/recommended', isRead: false, priority: 'normal' },
    { user: studentUsers[4]._id, title: 'Drive registration confirmed', message: 'You are registered for the NovaTech Campus Drive 2026.', type: 'drive', actionUrl: '/student/drives', isRead: false, priority: 'normal' },
    { user: companyUsers[0]._id, title: 'New application received', message: 'You have a new application for Full Stack Developer (MERN).', type: 'application', actionUrl: '/company/applications', isRead: false, priority: 'normal' },
    { user: tpo1._id, title: 'Job awaiting approval', message: 'GreenGrid Energy submitted a new job for approval.', type: 'job', actionUrl: '/tpo/jobs', isRead: false, priority: 'normal' },
  ];
  for (const n of notif) await Notification.create(n);

  /* ------- Contacts ------- */
  const contacts = [
    { name: 'Meera Kapoor', email: 'meera.kapoor@example.com', subject: 'Company registration query', message: 'We would like to register as a recruiting partner. What documents are required?', status: 'New' },
    { name: 'Rahul Sinha', email: 'rahul.sinha@example.com', subject: 'Student login issue', message: 'I am unable to verify my email OTP. Could you please help?', status: 'Read' },
    { name: 'Recruit Hub Pvt Ltd', email: 'contact@recruithub.example.com', subject: 'Partnership for campus drives', message: 'We are interested in conducting campus drives next semester.', status: 'New' },
    { name: 'Neha Bansal', email: 'neha.bansal@example.com', subject: 'Feedback on portal', message: 'The portal is very intuitive. Please add a dark mode for mobile too.', status: 'Resolved' },
    { name: 'Vikram Rao', email: 'vikram.rao@example.com', subject: 'Placement statistics request', message: 'Could you share the placement statistics for the Computer Engineering branch?', status: 'Read' },
  ];
  for (const c of contacts) await Contact.create(c);

  /* ------- Support tickets ------- */
  await SupportTicket.create({ user: studentUsers[2]._id, category: 'Profile', subject: 'Unable to edit CGPA', message: 'The CGPA field is not saving after edit.', status: 'Open' });
  await SupportTicket.create({ user: companyUsers[1]._id, category: 'Verification', subject: 'Verification document rejected', message: 'Our GST document was rejected without a clear reason.', status: 'In Progress', replyMessage: 'Thanks for reaching out. Please re-upload a clearer scan.', repliedBy: tpo1._id, repliedAt: at(-2) });
  await SupportTicket.create({ user: studentUsers[5]._id, category: 'Assessment', subject: 'Assessment did not load', message: 'The assessment page showed a blank screen on mobile.', status: 'Resolved', replyMessage: 'This has been fixed. Please clear your browser cache and retry.', repliedBy: tpo1._id, repliedAt: at(-5) });

  /* ------- Audit logs ------- */
  const audit = [
    { user: tpo1._id, action: 'login', module: 'auth', description: 'TPO signed in' },
    { user: tpo1._id, action: 'job_approved', module: 'jobs', description: 'Approved job: Full Stack Developer (MERN)' },
    { user: tpo1._id, action: 'drive_created', module: 'drives', description: 'Created drive: NovaTech Campus Drive 2026' },
    { user: companyUsers[0]._id, action: 'job_posted', module: 'jobs', description: 'Posted job: Frontend Engineer - React' },
    { user: studentUsers[0]._id, action: 'application_submitted', module: 'applications', description: 'Applied to Full Stack Developer (MERN)' },
    { user: studentUsers[1]._id, action: 'resume_uploaded', module: 'profile', description: 'Uploaded resume' },
    { user: tpo1._id, action: 'company_verified', module: 'companies', description: 'Verified company: BlueOrbit Systems' },
    { user: tpo2._id, action: 'announcement_published', module: 'announcements', description: 'Published announcement: Resume Building Workshop' },
  ];
  for (const a of audit) await AuditLog.create({ ...a, ipAddress: '127.0.0.1' });

  /* ------- Summary ------- */
  const counts = {
    users: await User.countDocuments(),
    students: await StudentProfile.countDocuments(),
    companies: await CompanyProfile.countDocuments(),
    jobs: await Job.countDocuments(),
    applications: await Application.countDocuments(),
    drives: await PlacementDrive.countDocuments(),
    interviews: await Interview.countDocuments(),
    assessments: await Assessment.countDocuments(),
    offers: await Offer.countDocuments(),
    placements: await Placement.countDocuments(),
    notifications: await Notification.countDocuments(),
  };
  console.log('\n✅ Seed complete:', counts);
  console.log('\nDemo credentials (password):');
  console.log('  TPO      tpo@careerconnect.local         Tpo@12345');
  console.log('  Student  student@careerconnect.local     Student@123');
  console.log('  Company  company@careerconnect.local     Company@123');
  console.log('\nOther students: <first>.<last>@careerconnect.local / Student@123');
  console.log('Other companies: see scripts/seed.js (Company@123)\n');

  await mongoose.disconnect();
}

main().catch((e) => { console.error(e); process.exit(1); });