/**
 * CampusNexus — Professional Company & Job Data Population Script
 *
 * Populates 15 diverse, realistic enterprise company profiles and 45 distinct
 * job openings (3 per company) across major Indian tech hubs and industries.
 *
 * Designed to be:
 * - SAFE & IDEMPOTENT: Uses findOneAndUpdate / upsert matching on email/name/title.
 *   Re-running this script will update or ensure records exist without creating
 *   duplicates or deleting student profiles, applications, or existing tests.
 * - PRODUCTION-READY: Works with both local MongoDB and MongoDB Atlas (Render).
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
/* 1. Extended Skills Catalogue                                       */
/* ------------------------------------------------------------------ */
const SKILLS_DATA = [
  { skillName: 'JavaScript', category: 'Programming' },
  { skillName: 'TypeScript', category: 'Programming' },
  { skillName: 'React', category: 'Frontend' },
  { skillName: 'Node.js', category: 'Backend' },
  { skillName: 'Express.js', category: 'Backend' },
  { skillName: 'MongoDB', category: 'Database' },
  { skillName: 'SQL', category: 'Database' },
  { skillName: 'PostgreSQL', category: 'Database' },
  { skillName: 'Python', category: 'Programming' },
  { skillName: 'Java', category: 'Programming' },
  { skillName: 'Spring Boot', category: 'Backend' },
  { skillName: 'Django', category: 'Backend' },
  { skillName: 'REST APIs', category: 'Backend' },
  { skillName: 'GraphQL', category: 'Backend' },
  { skillName: 'AWS', category: 'Cloud' },
  { skillName: 'Docker', category: 'DevOps' },
  { skillName: 'Kubernetes', category: 'DevOps' },
  { skillName: 'Linux', category: 'DevOps' },
  { skillName: 'Git', category: 'Tools' },
  { skillName: 'Data Structures', category: 'Core CS' },
  { skillName: 'Algorithms', category: 'Core CS' },
  { skillName: 'Machine Learning', category: 'Data & AI' },
  { skillName: 'Data Analysis', category: 'Data & AI' },
  { skillName: 'Cyber Security', category: 'Security' },
  { skillName: 'HTML/CSS', category: 'Frontend' },
  { skillName: 'Tailwind CSS', category: 'Frontend' },
  { skillName: 'React Native', category: 'Mobile' },
  { skillName: 'Figma', category: 'Design' },
  { skillName: 'Selenium', category: 'QA & Testing' },
  { skillName: 'Communication', category: 'Soft Skills' },
  { skillName: 'Problem Solving', category: 'Soft Skills' },
  { skillName: 'Cloud Computing', category: 'Cloud' },
];

/* ------------------------------------------------------------------ */
/* 2. 15 Diverse Demo Companies                                      */
/* ------------------------------------------------------------------ */
const COMPANIES_DATA = [
  {
    name: 'NovaTech Solutions',
    email: 'careers@novatech.demo',
    industry: 'Software Development',
    website: 'https://novatech.demo',
    phone: '+91 80 4123 5001',
    city: 'Bengaluru',
    address: 'Electronic City Phase 1, Hosur Road, Bengaluru 560100',
    description: 'A premier software product engineering firm delivering scalable microservices, cloud-native enterprise architectures, and robust web applications for global Fortune 500 partners.',
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
    name: 'BlueOrbit Systems',
    email: 'recruitment@blueorbit.demo',
    industry: 'IT Services',
    website: 'https://blueorbit.demo',
    phone: '+91 20 6710 4400',
    city: 'Pune',
    address: 'Tower 4, Cybercity Magarpatta / Hinjawadi Phase 2, Pune 411057',
    description: 'Global technology consulting and IT services provider delivering digital modernization, enterprise ERP migrations, and mission-critical system integration.',
    verificationStatus: 'verified',
  },
  {
    name: 'QuantumEdge AI Labs',
    email: 'ai-jobs@quantumedge.demo',
    industry: 'Artificial Intelligence',
    website: 'https://quantumedge.demo',
    phone: '+91 40 4855 3300',
    city: 'Hyderabad',
    address: 'V-Park, HITEC City, Madhapur, Hyderabad 500081',
    description: 'Deep tech AI research and engineering company developing proprietary LLM applications, multimodal computer vision systems, and autonomous predictive analytics.',
    verificationStatus: 'verified',
  },
  {
    name: 'CyberShield Infosec',
    email: 'security@cybershield.demo',
    industry: 'Cybersecurity',
    website: 'https://cybershield.demo',
    phone: '+91 124 456 7890',
    city: 'Gurugram',
    address: 'DLF Cyber City, Building 10, DLF Phase 2, Gurugram 122002',
    description: 'Elite cybersecurity operations firm specializing in Managed Detection & Response (MDR), penetration testing, cloud security audits, and automated DevSecOps pipelines.',
    verificationStatus: 'verified',
  },
  {
    name: 'Finova PayTech',
    email: 'careers@finovapay.demo',
    industry: 'FinTech',
    website: 'https://finovapay.demo',
    phone: '+91 22 6120 7000',
    city: 'Mumbai',
    address: 'One BKC, G Block, Bandra Kurla Complex, Mumbai 400051',
    description: 'Next-generation fintech engine powering high-frequency transaction processing, real-time UPI gateways, merchant settlement networks, and algorithmic fraud detection.',
    verificationStatus: 'verified',
  },
  {
    name: 'OmniCart Commerce',
    email: 'jobs@omnicart.demo',
    industry: 'E-commerce',
    website: 'https://omnicart.demo',
    phone: '+91 80 4900 2200',
    city: 'Bengaluru',
    address: '80 Feet Road, 4th Block, Koramangala, Bengaluru 560034',
    description: 'High-growth direct-to-consumer and B2B digital marketplace infrastructure company powering omni-channel inventory, recommendation engines, and lightning delivery.',
    verificationStatus: 'verified',
  },
  {
    name: 'DataSphere Analytics',
    email: 'talent@datasphere.demo',
    industry: 'Data Analytics',
    website: 'https://datasphere.demo',
    phone: '+91 265 233 4455',
    city: 'Vadodara',
    address: 'Alkapuri Business Centre, RC Dutt Road, Vadodara 390007',
    description: 'Enterprise big data consultancy building unified data lakes, automated ETL pipelines, real-time streaming dashboards, and business intelligence solutions.',
    verificationStatus: 'verified',
  },
  {
    name: 'PulseHealth Technologies',
    email: 'careers@pulsehealth.demo',
    industry: 'Healthcare Technology',
    website: 'https://pulsehealth.demo',
    phone: '+91 44 4300 8899',
    city: 'Chennai',
    address: 'Tidel Park, Rajiv Gandhi Salai, Taramani, Chennai 600113',
    description: 'Modern digital health platform transforming patient care through secure FHIR/HL7 electronic health records, AI-assisted diagnostics, and smart telemedicine apps.',
    verificationStatus: 'verified',
  },
  {
    name: 'PixelForge Interactive',
    email: 'jobs@pixelforge.demo',
    industry: 'Product Development',
    website: 'https://pixelforge.demo',
    phone: '+91 79 2656 1122',
    city: 'Remote',
    address: 'Silicon Square, C.G. Road, Ahmedabad 380009 / Fully Distributed',
    description: 'Award-winning digital product studio creating web platforms, enterprise design systems, high-performance UI/UX experiences, and interactive consumer apps.',
    verificationStatus: 'verified',
  },
  {
    name: 'Nexora Telematics & Networks',
    email: 'hr@nexoranetworks.demo',
    industry: 'Networking',
    website: 'https://nexoranetworks.demo',
    phone: '+91 120 488 9900',
    city: 'Noida',
    address: 'Logix Cyber Park, Sector 62, Noida 201309',
    description: 'Telecommunications and intelligent network software company developing SDN controllers, 5G edge connectivity solutions, and industrial IoT communication meshes.',
    verificationStatus: 'verified',
  },
  {
    name: 'AuraRobotics Dynamics',
    email: 'careers@aurarobotics.demo',
    industry: 'Robotics',
    website: 'https://aurarobotics.demo',
    phone: '+91 2692 230 450',
    city: 'Anand',
    address: 'GIDC Industrial Innovation Park, Vitthal Udyognagar, Anand 388121',
    description: 'Industrial automation pioneer manufacturing autonomous warehouse logistics robots, cobot arms, programmable PLCs, and intelligent computer-guided sensors.',
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
    description: 'B2B enterprise SaaS company creating intelligent ERP workflows, automated supply chain forecasting, and end-to-end procurement lifecycle management platforms.',
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
    verificationStatus: 'pending', // Realistic demo for TPO pending approval workflow
  },
];

/* ------------------------------------------------------------------ */
/* 3. 45 Diverse Jobs (3 per company)                                 */
/* ------------------------------------------------------------------ */
const JOBS_DATA = [
  // 1. NovaTech Solutions (Software Development)
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
    description: 'We are seeking an energetic MERN Stack Developer to engineer end-to-end web applications. You will be responsible for creating performant RESTful APIs with Node.js and Express, implementing stateful React components, and architecting data models in MongoDB. Collaborate in agile sprints with code reviews and automated CI/CD pipelines.',
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
    description: 'Own our high-traffic frontend user journeys. You will build accessible, responsive user interfaces using React, TypeScript, and modern design systems. Optimize Core Web Vitals, implement unit and integration testing, and collaborate closely with product managers and UX designers.',
  },
  {
    companyName: 'NovaTech Solutions',
    title: 'Backend Engineer (Node.js & Microservices)',
    jobType: 'Full Time',
    workMode: 'Onsite',
    location: 'Bengaluru',
    salaryMin: 750000,
    salaryMax: 1200000,
    experience: 'Fresher',
    qualification: 'B.Tech / MCA',
    vacancies: 4,
    deadlineDays: 90,
    approvalStatus: 'approved',
    skills: ['Node.js', 'REST APIs', 'Docker', 'MongoDB'],
    description: 'Develop resilient backend services and event-driven microservices. You will optimize database indexing, design REST APIs, integrate Redis caching layers, and containerize applications with Docker to ensure 99.9% service uptime.',
  },

  // 2. CloudVertex Technologies (Cloud Computing)
  {
    companyName: 'CloudVertex Technologies',
    title: 'Cloud Infrastructure Engineer (AWS)',
    jobType: 'Full Time',
    workMode: 'Hybrid',
    location: 'Ahmedabad',
    salaryMin: 700000,
    salaryMax: 1100000,
    experience: 'Fresher',
    qualification: 'B.Tech (CSE/IT/ECE)',
    vacancies: 5,
    deadlineDays: 70,
    approvalStatus: 'approved',
    skills: ['AWS', 'Cloud Computing', 'Docker', 'Git'],
    description: 'Design and deploy automated cloud landing zones on Amazon Web Services (AWS). You will write Infrastructure-as-Code (IaC), configure VPCs, load balancers, IAM security policies, and manage auto-scaling compute clusters.',
  },
  {
    companyName: 'CloudVertex Technologies',
    title: 'DevOps & CI/CD Trainee',
    jobType: 'Internship',
    workMode: 'Onsite',
    location: 'Ahmedabad',
    stipend: '₹22,000 / month',
    internshipDuration: '6 months',
    salaryMin: null,
    salaryMax: null,
    experience: 'Fresher',
    qualification: 'B.Tech / BCA / MCA',
    vacancies: 4,
    deadlineDays: 45,
    approvalStatus: 'approved',
    skills: ['Docker', 'Git', 'Linux', 'Problem Solving'],
    description: 'Hands-on 6-month internship in modern DevOps practices. Work alongside senior cloud architects to build GitHub Actions deployment pipelines, configure containerized environments, monitor log aggregations, and automate repetitive operational workflows.',
  },
  {
    companyName: 'CloudVertex Technologies',
    title: 'Site Reliability Engineer (SRE)',
    jobType: 'Full Time',
    workMode: 'Hybrid',
    location: 'Ahmedabad',
    salaryMin: 850000,
    salaryMax: 1400000,
    experience: 'Experienced',
    qualification: 'B.Tech / M.Tech / MCA',
    vacancies: 3,
    deadlineDays: 100,
    approvalStatus: 'approved',
    skills: ['Cloud Computing', 'Docker', 'Python', 'Problem Solving'],
    description: 'Ensure the availability, scalability, and latency of distributed cloud applications. Implement telemetry with Prometheus and Grafana, conduct blameless post-mortems, and script automated failover procedures in Python.',
  },

  // 3. BlueOrbit Systems (IT Services)
  {
    companyName: 'BlueOrbit Systems',
    title: 'Java Full Stack Developer',
    jobType: 'Full Time',
    workMode: 'Hybrid',
    location: 'Pune',
    salaryMin: 600000,
    salaryMax: 950000,
    experience: 'Fresher',
    qualification: 'B.Tech (All Branches) / MCA',
    vacancies: 8,
    deadlineDays: 65,
    approvalStatus: 'approved',
    skills: ['Java', 'Spring Boot', 'React', 'SQL'],
    description: 'Join BlueOrbit’s Enterprise Engineering Practice building mission-critical enterprise systems. Develop backend web services using Java and Spring Boot, connect relational databases, and build interactive dashboards with React.',
  },
  {
    companyName: 'BlueOrbit Systems',
    title: 'Associate Software Engineer',
    jobType: 'Fresher',
    workMode: 'Onsite',
    location: 'Pune',
    salaryMin: 480000,
    salaryMax: 650000,
    experience: 'Fresher',
    qualification: 'B.Tech / BE / MCA (2025/2026 Batch)',
    vacancies: 10,
    deadlineDays: 80,
    approvalStatus: 'approved',
    skills: ['Java', 'SQL', 'Data Structures', 'Algorithms'],
    description: 'Campus hiring program for promising graduating engineers. Complete rigorous bootcamp training across data structures, software development life cycle (SDLC), object-oriented programming, and relational database management.',
  },
  {
    companyName: 'BlueOrbit Systems',
    title: 'Database Administrator & SQL Specialist',
    jobType: 'Full Time',
    workMode: 'Hybrid',
    location: 'Pune',
    salaryMin: 650000,
    salaryMax: 1000000,
    experience: 'Fresher',
    qualification: 'B.Tech / BCA / MCA',
    vacancies: 3,
    deadlineDays: 95,
    approvalStatus: 'approved',
    skills: ['SQL', 'MongoDB', 'PostgreSQL', 'Problem Solving'],
    description: 'Manage, optimize, and secure enterprise relational and NoSQL databases. Write complex stored procedures, tune slow execution queries, configure backup/restore procedures, and implement data encryption standards.',
  },

  // 4. QuantumEdge AI Labs (Artificial Intelligence)
  {
    companyName: 'QuantumEdge AI Labs',
    title: 'AI/ML Research Engineer',
    jobType: 'Full Time',
    workMode: 'Hybrid',
    location: 'Hyderabad',
    salaryMin: 950000,
    salaryMax: 1600000,
    experience: 'Fresher',
    qualification: 'B.Tech / M.Tech (CSE/Data Science)',
    vacancies: 4,
    deadlineDays: 85,
    approvalStatus: 'approved',
    skills: ['Python', 'Machine Learning', 'Data Structures', 'Algorithms'],
    description: 'Train, evaluate, and deploy state-of-the-art machine learning models. Experiment with neural architectures, optimize inference latencies, fine-tune open-source LLMs, and publish production-grade ML APIs.',
  },
  {
    companyName: 'QuantumEdge AI Labs',
    title: 'Computer Vision & GenAI Intern',
    jobType: 'Internship',
    workMode: 'Hybrid',
    location: 'Hyderabad',
    stipend: '₹30,000 / month',
    internshipDuration: '6 months',
    salaryMin: null,
    salaryMax: null,
    experience: 'Fresher',
    qualification: 'B.Tech / M.Tech (Pre-final / Final Year)',
    vacancies: 3,
    deadlineDays: 40,
    approvalStatus: 'approved',
    skills: ['Python', 'Machine Learning', 'Data Analysis'],
    description: 'Research internship focusing on generative AI, image segmentation, and object detection. Work directly with principal researchers, annotate benchmark datasets, and build proof-of-concept AI agents.',
  },
  {
    companyName: 'QuantumEdge AI Labs',
    title: 'Data Scientist - Predictive Modeling',
    jobType: 'Full Time',
    workMode: 'Onsite',
    location: 'Hyderabad',
    salaryMin: 800000,
    salaryMax: 1300000,
    experience: 'Fresher',
    qualification: 'B.Tech / MCA / M.Sc Statistics',
    vacancies: 3,
    deadlineDays: 90,
    approvalStatus: 'approved',
    skills: ['Python', 'Data Analysis', 'SQL', 'Machine Learning'],
    description: 'Transform complex business datasets into predictive mathematical models. Conduct feature engineering, cross-validation, hypothesis testing, and generate actionable executive summaries through interactive visualizations.',
  },

  // 5. CyberShield Infosec (Cybersecurity)
  {
    companyName: 'CyberShield Infosec',
    title: 'Cybersecurity Analyst (SOC L1)',
    jobType: 'Full Time',
    workMode: 'Onsite',
    location: 'Gurugram',
    salaryMin: 550000,
    salaryMax: 850000,
    experience: 'Fresher',
    qualification: 'B.Tech (CSE/IT/ECE) / BCA / MCA',
    vacancies: 5,
    deadlineDays: 55,
    approvalStatus: 'approved',
    skills: ['Cyber Security', 'Cloud Computing', 'Problem Solving', 'Communication'],
    description: 'Join our 24/7 Security Operations Center (SOC). Monitor real-time telemetry from SIEM platforms, investigate alert anomalies, triage potential phishing attempts, and escalate confirmed security incidents.',
  },
  {
    companyName: 'CyberShield Infosec',
    title: 'Application Security & Penetration Tester',
    jobType: 'Full Time',
    workMode: 'Hybrid',
    location: 'Gurugram',
    salaryMin: 750000,
    salaryMax: 1200000,
    experience: 'Experienced',
    qualification: 'B.Tech / MCA',
    vacancies: 2,
    deadlineDays: 70,
    approvalStatus: 'approved',
    skills: ['Cyber Security', 'REST APIs', 'JavaScript', 'Problem Solving'],
    description: 'Conduct comprehensive penetration testing on web applications, REST APIs, and mobile apps. Identify OWASP Top 10 vulnerabilities, verify business logic flaws, and draft clear remediation reports for engineering squads.',
  },
  {
    companyName: 'CyberShield Infosec',
    title: 'Network Security Engineer Trainee',
    jobType: 'Fresher',
    workMode: 'Onsite',
    location: 'Gurugram',
    salaryMin: 450000,
    salaryMax: 600000,
    experience: 'Fresher',
    qualification: 'B.Tech / Diploma in IT/ECE',
    vacancies: 4,
    deadlineDays: 80,
    approvalStatus: 'approved',
    skills: ['Cyber Security', 'Linux', 'Cloud Computing', 'Communication'],
    description: 'Learn enterprise firewall configuration, VPN tunneling, zero-trust network access, and intrusion prevention policies. Ideal entry-level role for tech enthusiasts looking to build a career in cybersecurity.',
  },

  // 6. Finova PayTech (FinTech)
  {
    companyName: 'Finova PayTech',
    title: 'Java Backend Engineer - Payments Engine',
    jobType: 'Full Time',
    workMode: 'Onsite',
    location: 'Mumbai',
    salaryMin: 850000,
    salaryMax: 1450000,
    experience: 'Fresher',
    qualification: 'B.Tech (CSE/IT) / MCA',
    vacancies: 5,
    deadlineDays: 65,
    approvalStatus: 'approved',
    skills: ['Java', 'Spring Boot', 'SQL', 'REST APIs'],
    description: 'Engineer high-throughput transactional payment rails processing thousands of transactions per second. Maintain strict ACID compliance, idempotency keys, and automated banking reconciliation pipelines.',
  },
  {
    companyName: 'Finova PayTech',
    title: 'FinTech React Developer',
    jobType: 'Full Time',
    workMode: 'Hybrid',
    location: 'Mumbai',
    salaryMin: 700000,
    salaryMax: 1150000,
    experience: 'Fresher',
    qualification: 'B.Tech / BCA / MCA',
    vacancies: 4,
    deadlineDays: 85,
    approvalStatus: 'approved',
    skills: ['React', 'TypeScript', 'JavaScript', 'REST APIs'],
    description: 'Build secure, responsive web portals for retail banking, credit card management, and merchant onboarding. Integrate strict biometric and 2FA authentication, multi-step KYC flows, and dynamic financial charts.',
  },
  {
    companyName: 'Finova PayTech',
    title: 'QA Automation Engineer',
    jobType: 'Full Time',
    workMode: 'Onsite',
    location: 'Mumbai',
    salaryMin: 550000,
    salaryMax: 900000,
    experience: 'Fresher',
    qualification: 'B.Tech / BCA / MCA',
    vacancies: 3,
    deadlineDays: 75,
    approvalStatus: 'approved',
    skills: ['Java', 'Selenium', 'SQL', 'Problem Solving'],
    description: 'Design and execute automated end-to-end regression test suites for payment workflows. Write API automation scripts in Postman/RestAssured and UI automation in Selenium/Cypress.',
  },

  // 7. OmniCart Commerce (E-commerce)
  {
    companyName: 'OmniCart Commerce',
    title: 'Full Stack Engineer (Node.js & React)',
    jobType: 'Full Time',
    workMode: 'Hybrid',
    location: 'Bengaluru',
    salaryMin: 750000,
    salaryMax: 1250000,
    experience: 'Fresher',
    qualification: 'B.Tech / MCA',
    vacancies: 6,
    deadlineDays: 60,
    approvalStatus: 'approved',
    skills: ['React', 'Node.js', 'Express.js', 'MongoDB'],
    description: 'Power OmniCart’s customer discovery and checkout funnels. Architect modular UI widgets in React, design fast cart services in Node.js, and optimize inventory locking using MongoDB transactions.',
  },
  {
    companyName: 'OmniCart Commerce',
    title: 'Mobile App Developer (React Native)',
    jobType: 'Full Time',
    workMode: 'Remote',
    location: 'Bengaluru',
    salaryMin: 650000,
    salaryMax: 1100000,
    experience: 'Fresher',
    qualification: 'B.Tech / BCA / MCA',
    vacancies: 3,
    deadlineDays: 70,
    approvalStatus: 'approved',
    skills: ['React Native', 'React', 'JavaScript', 'REST APIs'],
    description: 'Build seamless iOS and Android consumer mobile applications using React Native. Implement push notifications, offline cart synchronization, smooth 60fps animations, and in-app analytics.',
  },
  {
    companyName: 'OmniCart Commerce',
    title: 'Data Analyst - Supply Chain & Logistics',
    jobType: 'Full Time',
    workMode: 'Onsite',
    location: 'Bengaluru',
    salaryMin: 550000,
    salaryMax: 850000,
    experience: 'Fresher',
    qualification: 'B.Tech / MCA / B.Sc',
    vacancies: 3,
    deadlineDays: 80,
    approvalStatus: 'approved',
    skills: ['SQL', 'Python', 'Data Analysis', 'Communication'],
    description: 'Analyze delivery turnaround times, warehouse stocking velocity, and return rates. Build automated reports, identify delivery bottlenecks, and recommend optimal fulfillment routing.',
  },

  // 8. DataSphere Analytics (Data Analytics)
  {
    companyName: 'DataSphere Analytics',
    title: 'Business Intelligence & Data Analyst',
    jobType: 'Full Time',
    workMode: 'Onsite',
    location: 'Vadodara',
    salaryMin: 500000,
    salaryMax: 800000,
    experience: 'Fresher',
    qualification: 'B.Tech / BCA / MCA / B.Sc IT',
    vacancies: 5,
    deadlineDays: 65,
    approvalStatus: 'approved',
    skills: ['Data Analysis', 'SQL', 'Python', 'Communication'],
    description: 'Translate raw transactional data into meaningful KPI executive dashboards. Write optimized SQL queries, conduct cohort retention analysis, and present findings clearly to leadership teams.',
  },
  {
    companyName: 'DataSphere Analytics',
    title: 'Big Data & ETL Pipeline Engineer',
    jobType: 'Full Time',
    workMode: 'Hybrid',
    location: 'Vadodara',
    salaryMin: 700000,
    salaryMax: 1150000,
    experience: 'Fresher',
    qualification: 'B.Tech / MCA',
    vacancies: 4,
    deadlineDays: 90,
    approvalStatus: 'approved',
    skills: ['Python', 'SQL', 'MongoDB', 'Cloud Computing'],
    description: 'Design automated ingestion workflows and data transformation pipelines. Cleanse petabyte-scale datasets, schedule Apache Airflow DAGs, and ensure data integrity across storage layers.',
  },
  {
    companyName: 'DataSphere Analytics',
    title: 'Data Analytics Intern',
    jobType: 'Internship',
    workMode: 'Hybrid',
    location: 'Vadodara',
    stipend: '₹18,000 / month',
    internshipDuration: '6 months',
    salaryMin: null,
    salaryMax: null,
    experience: 'Fresher',
    qualification: 'B.Tech / BCA / MCA',
    vacancies: 4,
    deadlineDays: 45,
    approvalStatus: 'approved',
    skills: ['SQL', 'Data Analysis', 'Problem Solving'],
    description: 'Gain practical experience working with enterprise data sets. Learn data modeling, exploratory data analysis (EDA), automated Excel/CSV pipelines, and SQL optimization under senior data mentors.',
  },

  // 9. PulseHealth Technologies (Healthcare Technology)
  {
    companyName: 'PulseHealth Technologies',
    title: 'Healthcare Systems Backend Developer',
    jobType: 'Full Time',
    workMode: 'Onsite',
    location: 'Chennai',
    salaryMin: 650000,
    salaryMax: 1050000,
    experience: 'Fresher',
    qualification: 'B.Tech (CSE/IT) / MCA',
    vacancies: 4,
    deadlineDays: 75,
    approvalStatus: 'approved',
    skills: ['Python', 'Django', 'REST APIs', 'SQL'],
    description: 'Develop HIPAA-compliant backend services for hospital management, doctor scheduling, and electronic prescription generation. Ensure rigorous data privacy, auditing, and high availability.',
  },
  {
    companyName: 'PulseHealth Technologies',
    title: 'Frontend Web Developer (HealthTech Portal)',
    jobType: 'Full Time',
    workMode: 'Hybrid',
    location: 'Chennai',
    salaryMin: 550000,
    salaryMax: 900000,
    experience: 'Fresher',
    qualification: 'B.Tech / BCA / MCA',
    vacancies: 4,
    deadlineDays: 85,
    approvalStatus: 'approved',
    skills: ['React', 'JavaScript', 'HTML/CSS', 'Tailwind CSS'],
    description: 'Create responsive web applications for doctors, clinics, and patients. Implement telehealth video-consultation interfaces, appointment calendars, and dynamic vitals graphing with React.',
  },
  {
    companyName: 'PulseHealth Technologies',
    title: 'Biomedical Data Analyst',
    jobType: 'Full Time',
    workMode: 'Onsite',
    location: 'Chennai',
    salaryMin: 600000,
    salaryMax: 950000,
    experience: 'Fresher',
    qualification: 'B.Tech (Biotech/CSE) / M.Sc',
    vacancies: 2,
    deadlineDays: 95,
    approvalStatus: 'approved',
    skills: ['Python', 'Data Analysis', 'SQL', 'Problem Solving'],
    description: 'Analyze clinical trial telemetry, wearable heart monitor signals, and patient outcome statistics. Perform statistical significance tests and validate data quality benchmarks.',
  },

  // 10. PixelForge Interactive (Product Development)
  {
    companyName: 'PixelForge Interactive',
    title: 'UI/UX Product Designer',
    jobType: 'Full Time',
    workMode: 'Remote',
    location: 'Remote',
    salaryMin: 600000,
    salaryMax: 1000000,
    experience: 'Fresher',
    qualification: 'Any Graduate / B.Des / B.Tech',
    vacancies: 3,
    deadlineDays: 70,
    approvalStatus: 'approved',
    skills: ['Figma', 'HTML/CSS', 'Communication', 'Problem Solving'],
    description: 'Design intuitive wireframes, interactive Figma prototypes, and cohesive design systems for world-class SaaS products. Conduct user empathy interviews and usability tests to continuously refine user journeys.',
  },
  {
    companyName: 'PixelForge Interactive',
    title: 'Creative Frontend Developer',
    jobType: 'Full Time',
    workMode: 'Remote',
    location: 'Remote',
    salaryMin: 700000,
    salaryMax: 1100000,
    experience: 'Fresher',
    qualification: 'B.Tech / BCA',
    vacancies: 3,
    deadlineDays: 80,
    approvalStatus: 'approved',
    skills: ['React', 'JavaScript', 'Tailwind CSS', 'Figma'],
    description: 'Bridge the gap between design and high-performance engineering. Bring complex micro-interactions, responsive grid layouts, and smooth CSS animations to life with clean React and Tailwind code.',
  },
  {
    companyName: 'PixelForge Interactive',
    title: 'UI/UX & Web Design Intern',
    jobType: 'Internship',
    workMode: 'Remote',
    location: 'Remote',
    stipend: '₹20,000 / month',
    internshipDuration: '6 months',
    salaryMin: null,
    salaryMax: null,
    experience: 'Fresher',
    qualification: 'Enrolled in B.Tech / B.Des / BCA',
    vacancies: 3,
    deadlineDays: 45,
    approvalStatus: 'approved',
    skills: ['Figma', 'HTML/CSS', 'Tailwind CSS'],
    description: 'Exciting remote design internship crafting icon sets, responsive mobile mockups, marketing landing page banners, and component states in Figma.',
  },

  // 11. Nexora Telematics & Networks (Networking)
  {
    companyName: 'Nexora Telematics & Networks',
    title: 'Network Protocol & Cloud Developer',
    jobType: 'Full Time',
    workMode: 'Onsite',
    location: 'Noida',
    salaryMin: 700000,
    salaryMax: 1100000,
    experience: 'Fresher',
    qualification: 'B.Tech (CSE/IT/ECE)',
    vacancies: 4,
    deadlineDays: 60,
    approvalStatus: 'approved',
    skills: ['Python', 'Cloud Computing', 'Linux', 'REST APIs'],
    description: 'Develop intelligent network management tools and cloud-connected routers. Implement TCP/IP, UDP, and MQTT streaming endpoints, monitor network packet latency, and automate network device configurations.',
  },
  {
    companyName: 'Nexora Telematics & Networks',
    title: 'Technical Support & Network Operations Engineer',
    jobType: 'Full Time',
    workMode: 'Onsite',
    location: 'Noida',
    salaryMin: 420000,
    salaryMax: 650000,
    experience: 'Fresher',
    qualification: 'B.Tech / Diploma in Engineering / BCA',
    vacancies: 6,
    deadlineDays: 85,
    approvalStatus: 'approved',
    skills: ['Communication', 'Linux', 'Cloud Computing', 'Problem Solving'],
    description: 'Diagnose enterprise customer connectivity queries, manage Linux server environments, inspect DNS and gateway routing records, and maintain service-level agreement (SLA) metrics.',
  },
  {
    companyName: 'Nexora Telematics & Networks',
    title: 'Graduate Engineer Trainee - IoT Networks',
    jobType: 'Fresher',
    workMode: 'Onsite',
    location: 'Noida',
    salaryMin: 450000,
    salaryMax: 600000,
    experience: 'Fresher',
    qualification: 'B.Tech (ECE/CSE/EE) 2025/2026 Batch',
    vacancies: 5,
    deadlineDays: 95,
    approvalStatus: 'approved',
    skills: ['Problem Solving', 'Python', 'Cloud Computing'],
    description: 'Structured engineering training program rotating across IoT edge hardware, cellular telemetry protocols, and cloud gateway integration. Excellent launchpad for networking engineers.',
  },

  // 12. AuraRobotics Dynamics (Robotics)
  {
    companyName: 'AuraRobotics Dynamics',
    title: 'Robotics Software Engineer (Embedded & ROS)',
    jobType: 'Full Time',
    workMode: 'Onsite',
    location: 'Anand',
    salaryMin: 650000,
    salaryMax: 1050000,
    experience: 'Fresher',
    qualification: 'B.Tech (Mechatronics/ECE/CSE) / M.Tech',
    vacancies: 3,
    deadlineDays: 65,
    approvalStatus: 'approved',
    skills: ['Python', 'Data Structures', 'Algorithms', 'Problem Solving'],
    description: 'Write kinematic trajectory control algorithms, sensor fusion logic (LiDAR, ultrasonic, IMU), and robotic navigation software in Python and C++ for warehouse automation robots.',
  },
  {
    companyName: 'AuraRobotics Dynamics',
    title: 'Automation Control & Firmware Developer',
    jobType: 'Full Time',
    workMode: 'Onsite',
    location: 'Anand',
    salaryMin: 600000,
    salaryMax: 950000,
    experience: 'Fresher',
    qualification: 'B.Tech (Electrical/ECE/CSE)',
    vacancies: 3,
    deadlineDays: 80,
    approvalStatus: 'approved',
    skills: ['Python', 'Problem Solving', 'Data Structures'],
    description: 'Develop embedded controllers and real-time firmware for automated guided vehicles (AGVs). Test motor driver interfaces, industrial CAN bus communication, and fail-safe safety relays.',
  },
  {
    companyName: 'AuraRobotics Dynamics',
    title: 'Graduate Trainee - Industrial Automation',
    jobType: 'Fresher',
    workMode: 'Onsite',
    location: 'Anand',
    salaryMin: 400000,
    salaryMax: 550000,
    experience: 'Fresher',
    qualification: 'B.Tech / Diploma (Mechanical/Electrical/Mechatronics)',
    vacancies: 4,
    deadlineDays: 90,
    approvalStatus: 'pending', // Realistic demo for TPO review
    skills: ['Communication', 'Problem Solving', 'Data Analysis'],
    description: 'Onsite technical training in assembly testing, robotic calibration, machine vision setup, and customer deployment support across industrial manufacturing plants in Gujarat.',
  },

  // 13. Zentrix Enterprise Solutions (Enterprise Software)
  {
    companyName: 'Zentrix Enterprise Solutions',
    title: 'Enterprise SaaS Developer (Full Stack)',
    jobType: 'Full Time',
    workMode: 'Hybrid',
    location: 'Hyderabad',
    salaryMin: 750000,
    salaryMax: 1200000,
    experience: 'Fresher',
    qualification: 'B.Tech / MCA',
    vacancies: 5,
    deadlineDays: 70,
    approvalStatus: 'approved',
    skills: ['React', 'Node.js', 'Spring Boot', 'SQL'],
    description: 'Build enterprise ERP modules covering procurement, supply chain forecasting, and audit logging. Work with modular React frontends, robust enterprise Java/Node services, and relational databases.',
  },
  {
    companyName: 'Zentrix Enterprise Solutions',
    title: 'Junior Software Developer',
    jobType: 'Fresher',
    workMode: 'Hybrid',
    location: 'Hyderabad',
    salaryMin: 450000,
    salaryMax: 650000,
    experience: 'Fresher',
    qualification: 'B.Tech / BCA / MCA (2025/2026 Batch)',
    vacancies: 6,
    deadlineDays: 85,
    approvalStatus: 'approved',
    skills: ['Java', 'JavaScript', 'SQL', 'Problem Solving'],
    description: 'Junior engineering opening for fast-learning graduates. Write clean, maintainable code, fix bug tickets, write unit tests, and participate in peer code reviews.',
  },
  {
    companyName: 'Zentrix Enterprise Solutions',
    title: 'Enterprise Technical Business Analyst',
    jobType: 'Full Time',
    workMode: 'Onsite',
    location: 'Hyderabad',
    salaryMin: 600000,
    salaryMax: 950000,
    experience: 'Fresher',
    qualification: 'B.Tech / MCA / MBA Tech',
    vacancies: 3,
    deadlineDays: 100,
    approvalStatus: 'approved',
    skills: ['Communication', 'SQL', 'Data Analysis', 'Problem Solving'],
    description: 'Bridge enterprise customer workflows with software engineering specifications. Document functional specifications, design user acceptance test (UAT) criteria, and query SQL databases for verification.',
  },

  // 14. EduSphere Learning Systems (EdTech)
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
    vacancies: 5,
    deadlineDays: 60,
    approvalStatus: 'approved',
    skills: ['MongoDB', 'Express.js', 'React', 'Node.js', 'JavaScript'],
    description: 'Build high-scale interactive classroom features for students across India. Create real-time quiz components, gradebook calculations, and video lecture progress trackers with the MERN stack.',
  },
  {
    companyName: 'EduSphere Learning Systems',
    title: 'React Developer - Interactive Learning Canvas',
    jobType: 'Full Time',
    workMode: 'Remote',
    location: 'Bengaluru',
    salaryMin: 600000,
    salaryMax: 950000,
    experience: 'Fresher',
    qualification: 'B.Tech / BCA / MCA',
    vacancies: 4,
    deadlineDays: 75,
    approvalStatus: 'approved',
    skills: ['React', 'TypeScript', 'HTML/CSS', 'Tailwind CSS'],
    description: 'Design and implement gamified learning games, interactive drag-and-drop code builders, and mathematical graph visualizers using React and modern HTML5 Canvas techniques.',
  },
  {
    companyName: 'EduSphere Learning Systems',
    title: 'Content & Assessment Engineering Trainee',
    jobType: 'Fresher',
    workMode: 'Hybrid',
    location: 'Bengaluru',
    salaryMin: 420000,
    salaryMax: 600000,
    experience: 'Fresher',
    qualification: 'B.Tech / BCA / B.Sc Computer Science',
    vacancies: 4,
    deadlineDays: 90,
    approvalStatus: 'approved',
    skills: ['JavaScript', 'Communication', 'Problem Solving'],
    description: 'Author and program interactive coding challenges, automated grading test suites, and diagnostic questions for computer engineering students.',
  },

  // 15. AdVantage Digital Media (Digital Marketing)
  {
    companyName: 'AdVantage Digital Media',
    title: 'AdTech Platform Backend Developer',
    jobType: 'Full Time',
    workMode: 'Hybrid',
    location: 'Mumbai',
    salaryMin: 700000,
    salaryMax: 1100000,
    experience: 'Fresher',
    qualification: 'B.Tech / MCA',
    vacancies: 4,
    deadlineDays: 80,
    approvalStatus: 'approved',
    skills: ['Node.js', 'REST APIs', 'SQL', 'Docker'],
    description: 'Build real-time bidding auction microservices and impression delivery trackers. Optimize low-latency Redis caching and write async event logging queues.',
  },
  {
    companyName: 'AdVantage Digital Media',
    title: 'Digital Marketing & Growth Analyst',
    jobType: 'Full Time',
    workMode: 'Onsite',
    location: 'Mumbai',
    salaryMin: 480000,
    salaryMax: 750000,
    experience: 'Fresher',
    qualification: 'Any Graduate / BBA / B.Tech',
    vacancies: 3,
    deadlineDays: 70,
    approvalStatus: 'approved',
    skills: ['Data Analysis', 'Communication', 'Problem Solving'],
    description: 'Analyze online conversion funnels, paid search performance, and click-through metrics across digital ad networks. Optimize customer acquisition costs (CAC) and customer lifetime value (LTV).',
  },
  {
    companyName: 'AdVantage Digital Media',
    title: 'Marketing Analytics & Tracking Specialist',
    jobType: 'Full Time',
    workMode: 'Hybrid',
    location: 'Mumbai',
    salaryMin: 500000,
    salaryMax: 800000,
    experience: 'Fresher',
    qualification: 'B.Tech / BCA / B.Sc',
    vacancies: 3,
    deadlineDays: 60,
    approvalStatus: 'pending', // Demo pending job for TPO review
    skills: ['JavaScript', 'Data Analysis', 'SQL'],
    description: 'Implement client-side analytics tags, Google Tag Manager data layers, pixel tracking, and verify attribution data integrity across web and mobile web apps.',
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
  console.log('\n--- Seeding 15 Professional Companies ---');
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
          logo: null, // UI automatically renders modern branded initial-avatar
        },
      },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );

    companyMap[c.name] = companyDoc;
    console.log(`  ✓ [${c.industry}] ${c.name} (${c.city}) — Status: ${c.verificationStatus}`);
  }

  // 3. Ensure 45 Job Openings & Job Skills
  console.log('\n--- Seeding 45 Diverse Job Openings ---');
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

  // 4. Ensure Demo TPO & Student Accounts for Complete Platform Usability
  console.log('\n--- Ensuring Demo TPO & Student Accounts ---');
  const tpoHash = await hashPassword('Tpo@123');
  await User.findOneAndUpdate(
    { email: 'tpo@careerconnect.local' },
    {
      $set: {
        name: 'Dr. Rajesh Verma (TPO)',
        role: 'tpo',
        status: 'active',
        emailVerifiedAt: new Date(),
      },
      $setOnInsert: { password: tpoHash, tokenVersion: 0, refreshVersion: 0 },
    },
    { upsert: true, new: true, setDefaultsOnInsert: true }
  );
  console.log('  ✓ TPO Account: tpo@careerconnect.local (Tpo@123)');

  const studentHash = await hashPassword('Student@123');
  const DEMO_STUDENTS = [
    {
      name: 'Aarav Sharma',
      email: 'student@careerconnect.local',
      phone: '+91 98250 11001',
      gender: 'Male',
      dob: new Date('2004-03-12'),
      course: 'B.Tech',
      branch: 'Computer Engineering',
      semester: '8',
      cgpa: 8.7,
      backlogs: 0,
      passingYear: 2026,
      city: 'Ahmedabad',
      enrollmentNo: 'ENR2022001',
      about: 'Final-year Computer Engineering student passionate about full-stack web development and scalable systems.',
      placementStatus: 'not_placed',
      skills: ['JavaScript', 'React', 'Node.js', 'MongoDB', 'Git', 'Problem Solving'],
    },
    {
      name: 'Isha Patel',
      email: 'isha.patel@careerconnect.local',
      phone: '+91 98250 11002',
      gender: 'Female',
      dob: new Date('2004-07-21'),
      course: 'B.Tech',
      branch: 'Information Technology',
      semester: '8',
      cgpa: 9.1,
      backlogs: 0,
      passingYear: 2026,
      city: 'Ahmedabad',
      enrollmentNo: 'ENR2022002',
      about: 'IT undergraduate with a strong foundation in cloud technologies and data structures.',
      placementStatus: 'placed',
      skills: ['Java', 'SQL', 'AWS', 'Data Structures', 'Communication'],
    },
    {
      name: 'Rohan Mehta',
      email: 'rohan.mehta@careerconnect.local',
      phone: '+91 98250 11003',
      gender: 'Male',
      dob: new Date('2004-01-09'),
      course: 'B.Tech',
      branch: 'Computer Engineering',
      semester: '8',
      cgpa: 7.8,
      backlogs: 0,
      passingYear: 2026,
      city: 'Surat',
      enrollmentNo: 'ENR2022003',
      about: 'Backend enthusiast building REST APIs with Node.js and Express.',
      placementStatus: 'not_placed',
      skills: ['Node.js', 'Express.js', 'REST APIs', 'MongoDB', 'Git'],
    },
  ];

  for (const s of DEMO_STUDENTS) {
    const sUser = await User.findOneAndUpdate(
      { email: s.email },
      {
        $set: {
          name: s.name,
          role: 'student',
          status: 'active',
          emailVerifiedAt: new Date(),
        },
        $setOnInsert: { password: studentHash, tokenVersion: 0, refreshVersion: 0 },
      },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );

    const sProfile = await StudentProfile.findOneAndUpdate(
      { user: sUser._id },
      {
        $set: {
          phone: s.phone,
          gender: s.gender,
          dob: s.dob,
          course: s.course,
          branch: s.branch,
          semester: s.semester,
          cgpa: s.cgpa,
          backlogs: s.backlogs,
          passingYear: s.passingYear,
          city: s.city,
          enrollmentNo: s.enrollmentNo,
          about: s.about,
          placementStatus: s.placementStatus,
          profileCompletion: 95,
        },
      },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );

    for (const sk of s.skills) {
      const skDoc = skillMap[sk];
      if (skDoc) {
        await StudentSkill.findOneAndUpdate(
          { student: sUser._id, skill: skDoc },
          { $set: { proficiency: 'Advanced' } },
          { upsert: true, new: true }
        );
      }
    }
    console.log(`  ✓ Student Account: ${s.email} (${s.name})`);
  }

  console.log(`======================================================\n`);

  await mongoose.disconnect();
  console.log('MongoDB connection closed cleanly.');
}

if (require.main === module) {
  seedCompaniesAndJobs()
    .then(() => process.exit(0))
    .catch((err) => {
      console.error('Seeding error:', err);
      process.exit(1);
    });
}

module.exports = { seedCompaniesAndJobs, COMPANIES_DATA, JOBS_DATA };
