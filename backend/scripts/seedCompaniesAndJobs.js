/**
 * CampusNexus — Optimized Company & Job Data Population Script
 *
 * Populates 5 premier enterprise company profiles and 10 high-demand job openings
 * (2 per company) designed for high performance, fast loading, and low memory usage on Render.
 *
 * Usage:
 *   node scripts/seedCompaniesAndJobs.js
 *   npm run seed:companies-jobs
 */

const mongoose = require('mongoose');
const env = require('../src/config/env');
const { hashPassword } = require('../src/utils/crypto');

const User = require('../src/models/User');
const StudentProfile = require('../src/models/StudentProfile');
const CompanyProfile = require('../src/models/CompanyProfile');
const { Job, JobSkill } = require('../src/models/Job');
const { Skill, StudentSkill } = require('../src/models/Skill');

const DAY = 86400000;
const futureDate = (days) => new Date(Date.now() + days * DAY);

/* ------------------------------------------------------------------ */
/* 1. Core Skills Catalogue                                           */
/* ------------------------------------------------------------------ */
const SKILLS_DATA = [
  { skillName: 'JavaScript', category: 'Programming' },
  { skillName: 'TypeScript', category: 'Programming' },
  { skillName: 'React', category: 'Frontend' },
  { skillName: 'Node.js', category: 'Backend' },
  { skillName: 'Express.js', category: 'Backend' },
  { skillName: 'MongoDB', category: 'Database' },
  { skillName: 'SQL', category: 'Database' },
  { skillName: 'Python', category: 'Programming' },
  { skillName: 'Java', category: 'Programming' },
  { skillName: 'REST APIs', category: 'Backend' },
  { skillName: 'AWS', category: 'Cloud' },
  { skillName: 'Docker', category: 'DevOps' },
  { skillName: 'Git', category: 'Tools' },
  { skillName: 'Data Structures', category: 'Core CS' },
  { skillName: 'Algorithms', category: 'Core CS' },
  { skillName: 'HTML/CSS', category: 'Frontend' },
  { skillName: 'Tailwind CSS', category: 'Frontend' },
  { skillName: 'Communication', category: 'Soft Skills' },
  { skillName: 'Problem Solving', category: 'Soft Skills' },
  { skillName: 'Cloud Computing', category: 'Cloud' },
];

/* ------------------------------------------------------------------ */
/* 2. 5 Premier Demo Companies                                        */
/* ------------------------------------------------------------------ */
const COMPANIES_DATA = [
  {
    name: 'NovaTech Solutions',
    email: 'company.demo@careerconnect.com',
    industry: 'Software Development',
    website: 'https://novatech.demo',
    phone: '+91 80 4123 5001',
    city: 'Bengaluru',
    address: 'Electronic City Phase 1, Hosur Road, Bengaluru 560100',
    description: 'A premier software product engineering firm delivering scalable microservices, cloud-native enterprise architectures, and robust web applications for global partners.',
    verificationStatus: 'verified',
  },
  {
    name: 'CloudVertex Technologies',
    email: 'talent@cloudvertex.demo',
    industry: 'Cloud Computing',
    website: 'https://cloudvertex.demo',
    phone: '+91 79 4030 8200',
    city: 'Ahmedabad',
    address: 'Block B, GIFT City Tech Zone, Gandhinagar / Ahmedabad 382355',
    description: 'Specialists in high-availability multi-cloud infrastructure, automated Kubernetes deployments, serverless systems, and 24/7 Site Reliability Engineering (SRE).',
    verificationStatus: 'verified',
  },
  {
    name: 'Zentrix Enterprise Solutions',
    email: 'enterprise@zentrix.demo',
    industry: 'Enterprise Software',
    website: 'https://zentrix.demo',
    phone: '+91 40 6900 1100',
    city: 'Hyderabad',
    address: 'Mindspace IT Park, Building 12B, Madhapur, Hyderabad 500081',
    description: 'B2B enterprise SaaS company creating intelligent ERP workflows, automated supply chain forecasting, and procurement lifecycle management platforms.',
    verificationStatus: 'verified',
  },
  {
    name: 'EduSphere Learning Systems',
    email: 'hiring@edusphere.demo',
    industry: 'EdTech',
    website: 'https://edusphere.demo',
    phone: '+91 80 4350 7711',
    city: 'Bengaluru',
    address: '27th Main, Sector 1, HSR Layout, Bengaluru 560102',
    description: 'Next-gen online learning ecosystems powering gamified STEM curricula, AI-driven adaptive learning assessments, and virtual proctoring technologies.',
    verificationStatus: 'verified',
  },
  {
    name: 'AdVantage Digital Media',
    email: 'talent@advantagemedia.demo',
    industry: 'Digital Marketing',
    website: 'https://advantagemedia.demo',
    phone: '+91 22 2490 8822',
    city: 'Mumbai',
    address: 'Kamala Mills Compound, Senapati Bapat Marg, Lower Parel, Mumbai 400013',
    description: 'AdTech platform engineering team building real-time bidding exchanges, conversion attribution algorithms, and targeted marketing analytics pipelines.',
    verificationStatus: 'verified',
  },
];

/* ------------------------------------------------------------------ */
/* 3. 10 High-Demand Jobs (2 per company)                             */
/* ------------------------------------------------------------------ */
const JOBS_DATA = [
  // 1. NovaTech Solutions
  {
    companyName: 'NovaTech Solutions',
    title: 'MERN Stack Developer',
    jobType: 'Full Time',
    workMode: 'Hybrid',
    location: 'Bengaluru',
    salaryMin: 650000,
    salaryMax: 1000000,
    experience: 'Fresher',
    qualification: 'B.Tech (CSE/IT) / MCA',
    vacancies: 6,
    deadlineDays: 60,
    approvalStatus: 'approved',
    skills: ['React', 'Node.js', 'Express.js', 'MongoDB', 'JavaScript'],
    description: 'We are seeking an energetic MERN Stack Developer to engineer end-to-end web applications. You will create performant RESTful APIs with Node.js and Express, implement stateful React components, and architect data models in MongoDB.',
  },
  {
    companyName: 'NovaTech Solutions',
    title: 'Senior Frontend Engineer - React',
    jobType: 'Full Time',
    workMode: 'Remote',
    location: 'Bengaluru',
    salaryMin: 800000,
    salaryMax: 1350000,
    experience: 'Experienced',
    qualification: 'B.Tech / MCA',
    vacancies: 3,
    deadlineDays: 75,
    approvalStatus: 'approved',
    skills: ['React', 'TypeScript', 'Tailwind CSS', 'Git'],
    description: 'Own our high-traffic frontend user journeys. Build accessible, responsive interfaces using React, TypeScript, and modern design systems. Optimize Core Web Vitals and collaborate closely with product teams.',
  },

  // 2. CloudVertex Technologies
  {
    companyName: 'CloudVertex Technologies',
    title: 'DevOps & CI/CD Trainee',
    jobType: 'Internship',
    workMode: 'Hybrid',
    location: 'Ahmedabad',
    stipend: '₹22,000 / month',
    internshipDuration: '6 months',
    experience: 'Fresher',
    qualification: 'B.Tech (CSE/IT/ECE)',
    vacancies: 4,
    deadlineDays: 45,
    approvalStatus: 'approved',
    skills: ['Docker', 'Git', 'Linux', 'AWS'],
    description: 'Learn modern cloud operations from senior SREs. You will configure automated GitHub Actions pipelines, containerize backend microservices using Docker, and manage AWS environments.',
  },
  {
    companyName: 'CloudVertex Technologies',
    title: 'Site Reliability Engineer (SRE)',
    jobType: 'Full Time',
    workMode: 'Hybrid',
    location: 'Ahmedabad',
    salaryMin: 850000,
    salaryMax: 1300000,
    experience: 'Experienced',
    qualification: 'B.Tech / M.Tech',
    vacancies: 2,
    deadlineDays: 60,
    approvalStatus: 'approved',
    skills: ['AWS', 'Docker', 'Linux', 'Problem Solving'],
    description: 'Maintain 99.99% availability for enterprise customer workloads. Set up Prometheus/Grafana observability dashboards, automate incident mitigation scripts, and conduct blameless post-mortems.',
  },

  // 3. Zentrix Enterprise Solutions
  {
    companyName: 'Zentrix Enterprise Solutions',
    title: 'Enterprise SaaS Developer (Full Stack)',
    jobType: 'Full Time',
    workMode: 'Hybrid',
    location: 'Hyderabad',
    salaryMin: 700000,
    salaryMax: 1150000,
    experience: 'Fresher',
    qualification: 'B.Tech (CSE/IT) / MCA',
    vacancies: 5,
    deadlineDays: 60,
    approvalStatus: 'approved',
    skills: ['JavaScript', 'React', 'Node.js', 'SQL'],
    description: 'Develop modules for our core enterprise resource planning platform. Write high-concurrency SQL queries, build scalable microservices, and design intuitive workflow interfaces.',
  },
  {
    companyName: 'Zentrix Enterprise Solutions',
    title: 'Junior Software Developer',
    jobType: 'Full Time',
    workMode: 'Onsite',
    location: 'Hyderabad',
    salaryMin: 550000,
    salaryMax: 850000,
    experience: 'Fresher',
    qualification: 'B.Tech / BCA / MCA',
    vacancies: 6,
    deadlineDays: 90,
    approvalStatus: 'approved',
    skills: ['Data Structures', 'Algorithms', 'SQL', 'Problem Solving'],
    description: 'Ideal launchpad for high-aptitude freshers. Build reliable features across web and database layers while receiving structured mentorship from staff software architects.',
  },

  // 4. EduSphere Learning Systems
  {
    companyName: 'EduSphere Learning Systems',
    title: 'EdTech Full Stack Engineer (MERN)',
    jobType: 'Full Time',
    workMode: 'Hybrid',
    location: 'Bengaluru',
    salaryMin: 650000,
    salaryMax: 1050000,
    experience: 'Fresher',
    qualification: 'B.Tech / MCA',
    vacancies: 4,
    deadlineDays: 60,
    approvalStatus: 'approved',
    skills: ['React', 'Node.js', 'Express.js', 'MongoDB'],
    description: 'Create interactive learning applications utilized by thousands of schools. Engineer responsive web dashboards, real-time assessment engines, and secure content delivery APIs.',
  },
  {
    companyName: 'EduSphere Learning Systems',
    title: 'React Developer - Interactive Learning Canvas',
    jobType: 'Full Time',
    workMode: 'Remote',
    location: 'Bengaluru',
    salaryMin: 700000,
    salaryMax: 1100000,
    experience: 'Experienced',
    qualification: 'B.Tech / BCA',
    vacancies: 3,
    deadlineDays: 75,
    approvalStatus: 'approved',
    skills: ['React', 'JavaScript', 'HTML/CSS', 'Git'],
    description: 'Design dynamic educational canvas tools and rich interactive quiz widgets using React and HTML5. Optimize render performance for low-bandwidth school networks.',
  },

  // 5. AdVantage Digital Media
  {
    companyName: 'AdVantage Digital Media',
    title: 'AdTech Platform Backend Developer',
    jobType: 'Full Time',
    workMode: 'Onsite',
    location: 'Mumbai',
    salaryMin: 750000,
    salaryMax: 1250000,
    experience: 'Fresher',
    qualification: 'B.Tech (CSE/IT)',
    vacancies: 3,
    deadlineDays: 60,
    approvalStatus: 'approved',
    skills: ['Node.js', 'REST APIs', 'SQL', 'Problem Solving'],
    description: 'Build backend pipelines capable of processing thousands of ad bids per second. You will implement fast database schemas, microservice APIs, and automated telemetry.',
  },
  {
    companyName: 'AdVantage Digital Media',
    title: 'Digital Marketing & Growth Analyst',
    jobType: 'Full Time',
    workMode: 'Hybrid',
    location: 'Mumbai',
    salaryMin: 500000,
    salaryMax: 800000,
    experience: 'Fresher',
    qualification: 'B.Tech / BCA / BBA / MCA',
    vacancies: 4,
    deadlineDays: 60,
    approvalStatus: 'approved',
    skills: ['Data Analysis', 'SQL', 'Communication'],
    description: 'Analyze digital ad campaign conversion attribution, monitor cost-per-click trends, build real-time performance dashboards, and deliver actionable growth recommendations.',
  },
];

/* ------------------------------------------------------------------ */
/* Main Seeder Function                                               */
/* ------------------------------------------------------------------ */
async function seedCompaniesAndJobs() {
  const mongoUri = process.env.MONGO_URI || env.MONGO_URI || 'mongodb://127.0.0.1:27017/careerconnect';
  console.log('Connecting to MongoDB...');
  await mongoose.connect(mongoUri);
  console.log('Connected to database:', mongoose.connection.name);

  // 1. Ensure Skills Catalogue
  console.log('\n--- Ensuring Skills Catalogue ---');
  const skillMap = {};
  for (const s of SKILLS_DATA) {
    const doc = await Skill.findOneAndUpdate(
      { skillName: s.skillName },
      { $set: { category: s.category } },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );
    skillMap[s.skillName] = doc._id;
  }
  console.log(`Successfully verified ${Object.keys(skillMap).length} skills.`);

  // 2. Ensure Companies & Recruiter Users
  console.log('\n--- Seeding 5 Premier Companies ---');
  const companyMap = {};
  const defaultPasswordHash = await hashPassword('Company@123');

  for (const c of COMPANIES_DATA) {
    // A. Recruiter User account
    const userDoc = await User.findOneAndUpdate(
      { email: c.email.toLowerCase() },
      {
        $set: {
          name: c.name,
          email: c.email.toLowerCase(),
          role: 'company',
          status: 'active',
          emailVerifiedAt: new Date(Date.now() - 30 * DAY),
        },
        $setOnInsert: {
          password: defaultPasswordHash,
          tokenVersion: 0,
          refreshVersion: 0,
        },
      },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );

    // B. Company Profile
    const companyDoc = await CompanyProfile.findOneAndUpdate(
      { user: userDoc._id },
      {
        $set: {
          companyName: c.name,
          industry: c.industry,
          website: c.website,
          email: c.email.toLowerCase(),
          phone: c.phone,
          address: c.address,
          city: c.city,
          description: c.description,
          verificationStatus: c.verificationStatus,
          logo: null,
        },
      },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );

    companyMap[c.name] = companyDoc;
    console.log(`  ✓ [${c.industry}] ${c.name} (${c.city}) — Status: ${c.verificationStatus}`);
  }

  // 3. Ensure 10 Job Openings & Job Skills
  console.log('\n--- Seeding 10 High-Demand Job Openings ---');
  let jobsCreatedOrUpdated = 0;
  let jobSkillsLinked = 0;

  for (const j of JOBS_DATA) {
    const compDoc = companyMap[j.companyName];
    if (!compDoc) {
      console.warn(`Warning: Company not found for job "${j.title}" (${j.companyName})`);
      continue;
    }

    const deadline = futureDate(j.deadlineDays || 60);

    const jobDoc = await Job.findOneAndUpdate(
      {
        company: compDoc._id,
        title: j.title,
      },
      {
        $set: {
          description: j.description,
          qualification: j.qualification,
          experience: j.experience,
          salaryMin: j.salaryMin,
          salaryMax: j.salaryMax,
          location: j.location,
          jobType: j.jobType,
          workMode: j.workMode,
          vacancies: j.vacancies,
          internshipDuration: j.internshipDuration || null,
          stipend: j.stipend || null,
          deadline,
          status: 'Open',
          approvalStatus: j.approvalStatus || 'approved',
        },
      },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );
    jobsCreatedOrUpdated++;

    // Link required skills
    if (j.skills && j.skills.length > 0) {
      for (const skillName of j.skills) {
        const skillId = skillMap[skillName];
        if (skillId) {
          await JobSkill.findOneAndUpdate(
            { job: jobDoc._id, skill: skillId },
            { $set: { isRequired: true } },
            { upsert: true, new: true }
          );
          jobSkillsLinked++;
        }
      }
    }
  }

  console.log(`\n======================================================`);
  console.log(`  POPULATION SUMMARY`);
  console.log(`======================================================`);
  console.log(`  Companies Populated : ${COMPANIES_DATA.length}`);
  console.log(`  Jobs Processed      : ${jobsCreatedOrUpdated}`);
  console.log(`  Job Skills Linked   : ${jobSkillsLinked}`);
  console.log(`  All Recruiter Logins: Company@123`);

  await mongoose.disconnect();
  console.log('\nSeeding completed successfully.');
}

if (require.main === module) {
  seedCompaniesAndJobs()
    .then(() => process.exit(0))
    .catch((err) => {
      console.error('Seeding failed:', err);
      process.exit(1);
    });
}

module.exports = { seedCompaniesAndJobs, COMPANIES_DATA, JOBS_DATA, SKILLS_DATA };
