/**
 * CareerConnect — Student Context Service
 * Retrieves authenticated student-specific information from the database
 * with strict access control and security scoping.
 */

const User = require('../models/User');
const StudentProfile = require('../models/StudentProfile');
const { Education, Project, Certification, Resume, CareerPreference, CareerRoadmap } = require('../models/Student');
const { StudentSkill } = require('../models/Skill');
const { Application, Offer, Placement } = require('../models/Application');
const { SavedJob, Job } = require('../models/Job');
const { DriveRegistration, Interview } = require('../models/Drive');
const { Notification } = require('../models/Misc');

/**
 * Classifies the student question to prioritize which context data should be loaded.
 * @param {string} message
 * @returns {string} contextCategory ('profile' | 'skills' | 'applications' | 'interviews' | 'jobs' | 'academics' | 'placement' | 'comprehensive')
 */
function classifyQuestion(message = '') {
  const m = message.toLowerCase();

  if (/profile|who am i|my name|about me|details|contact|phone|address|enrollment/i.test(m)) {
    return 'profile';
  }
  if (/skill|tech stack|proficiency|knowledge|learn|improve skills|what should i learn/i.test(m)) {
    return 'skills';
  }
  if (/cgpa|marks|percentage|grade|backlog|semester|branch|course|academics|education|college|institute|university/i.test(m)) {
    return 'academics';
  }
  if (/application|applied|status|shortlist|reviewing|selection|rejection/i.test(m)) {
    return 'applications';
  }
  if (/interview|round|schedule|technical round|hr round|interviewer|meeting link/i.test(m)) {
    return 'interviews';
  }
  if (/offer|placed|placement status|package|salary|joining|placed at/i.test(m)) {
    return 'placement';
  }
  if (/job|recommend|opening|hiring|vacancy|saved|alert|drive|campus drive/i.test(m)) {
    return 'jobs';
  }
  if (/project|portfolio|certification|certificate|resume|cv/i.test(m)) {
    return 'portfolio';
  }

  // Default to comprehensive context for general career guidance & overview
  return 'comprehensive';
}

/**
 * Retrieves safe, sanitized student context scoped strictly to the authenticated userId.
 * @param {string|mongoose.Types.ObjectId} userId
 * @param {string} [contextCategory='comprehensive']
 * @returns {Promise<Object>}
 */
async function getStudentContext(userId, contextCategory = 'comprehensive') {
  if (!userId) {
    throw new Error('User ID is required to fetch student context');
  }

  // Core identity - Always fetch User and StudentProfile
  const [user, profile] = await Promise.all([
    User.findById(userId).select('name email role status lastLogin createdAt').lean(),
    StudentProfile.findOne({ user: userId }).lean(),
  ]);

  if (!user) {
    throw new Error('Student user record not found');
  }

  const category = contextCategory || classifyQuestion('');

  // Parallel fetch scoped by student: userId
  const [
    skills,
    education,
    projects,
    certifications,
    resumes,
    preferences,
    applications,
    interviews,
    offers,
    placements,
    savedJobs,
    driveRegistrations,
    recentNotifications,
  ] = await Promise.all([
    // Skills
    StudentSkill.find({ student: userId })
      .populate('skill', 'skillName category')
      .lean(),

    // Academics
    Education.find({ student: userId }).sort({ passingYear: -1 }).lean(),

    // Projects (limit 6)
    Project.find({ student: userId }).sort({ _id: -1 }).limit(6).lean(),

    // Certifications (limit 6)
    Certification.find({ student: userId }).sort({ issueDate: -1 }).limit(6).lean(),

    // Resume info (latest 2)
    Resume.find({ student: userId }).sort({ uploadedAt: -1 }).limit(2).select('-filePath').lean(),

    // Career preferences
    CareerPreference.findOne({ student: userId }).lean(),

    // Applications with job and company details (limit 15)
    Application.find({ student: userId })
      .populate({
        path: 'job',
        select: 'title location jobType workMode salaryMin salaryMax vacancies company',
        populate: { path: 'company', select: 'companyName industry city' },
      })
      .sort({ appliedAt: -1 })
      .limit(15)
      .lean(),

    // Interviews (limit 10)
    Interview.find({ student: userId })
      .populate('company', 'companyName')
      .populate({
        path: 'application',
        select: 'job status',
        populate: { path: 'job', select: 'title' },
      })
      .sort({ interviewDate: 1 })
      .limit(10)
      .lean(),

    // Offers
    Offer.find({ student: userId })
      .populate('company', 'companyName')
      .populate('job', 'title location salaryMin salaryMax')
      .sort({ createdAt: -1 })
      .lean(),

    // Placements
    Placement.find({ student: userId })
      .populate('company', 'companyName')
      .populate('job', 'title')
      .lean(),

    // Saved Jobs (limit 5)
    SavedJob.find({ student: userId })
      .populate({
        path: 'job',
        select: 'title location jobType salaryMin salaryMax deadline company',
        populate: { path: 'company', select: 'companyName' },
      })
      .limit(5)
      .lean(),

    // Campus Drive Registrations (limit 6)
    DriveRegistration.find({ student: userId })
      .populate({
        path: 'drive',
        select: 'driveTitle driveDate mode venue status company',
        populate: { path: 'company', select: 'companyName' },
      })
      .sort({ registeredAt: -1 })
      .limit(6)
      .lean(),

    // Recent notifications (limit 3)
    Notification.find({ user: userId, isRead: false })
      .sort({ createdAt: -1 })
      .limit(3)
      .select('title message type createdAt')
      .lean(),
  ]);

  // Query top 5 active jobs that match the student's branch or open to all
  let recommendedOpenJobs = [];
  try {
    const today = new Date();
    const branchFilter = profile?.branch ? [profile.branch, null] : null;
    const jobQuery = {
      status: 'Open',
      approvalStatus: 'approved',
      deadline: { $gte: today },
    };
    recommendedOpenJobs = await Job.find(jobQuery)
      .populate('company', 'companyName industry city')
      .select('title location jobType workMode salaryMin salaryMax vacancies deadline company qualification')
      .sort({ deadline: 1 })
      .limit(5)
      .lean();
  } catch (err) {
    // Graceful fallback
    recommendedOpenJobs = [];
  }

  // Construct structured sanitized context
  return {
    student: {
      name: user.name,
      email: user.email,
      role: user.role,
      joinedAt: user.createdAt,
    },
    profile: {
      enrollmentNo: profile?.enrollmentNo || 'Not specified',
      course: profile?.course || 'Not specified',
      branch: profile?.branch || 'Not specified',
      semester: profile?.semester || 'Not specified',
      cgpa: profile?.cgpa !== null && profile?.cgpa !== undefined ? profile.cgpa : 'Not recorded',
      passingYear: profile?.passingYear || 'Not specified',
      backlogs: profile?.backlogs !== undefined ? profile.backlogs : 0,
      placementStatus: profile?.placementStatus || 'not_placed',
      profileCompletion: profile?.profileCompletion || 0,
      city: profile?.city || 'Not specified',
      about: profile?.about || '',
    },
    skills: skills.map((s) => ({
      name: s.skill?.skillName || 'Unknown Skill',
      category: s.skill?.category || 'General',
      proficiency: s.proficiency || 'Intermediate',
    })),
    education: education.map((e) => ({
      qualification: e.qualification,
      institute: e.institute,
      boardOrUniversity: e.university || e.board || 'N/A',
      branchOrStream: e.branch || e.stream || 'N/A',
      passingYear: e.passingYear,
      cgpaOrPercentage: e.cgpa ? `${e.cgpa} CGPA` : e.percentage ? `${e.percentage}%` : 'N/A',
    })),
    projects: projects.map((p) => ({
      title: p.title,
      description: p.description,
      technologies: p.technologies,
      hasGithub: Boolean(p.githubUrl),
      hasLiveUrl: Boolean(p.projectUrl),
    })),
    certifications: certifications.map((c) => ({
      name: c.name,
      issuingOrganization: c.issuingOrganization,
      issueDate: c.issueDate,
    })),
    resumes: resumes.map((r) => ({
      fileName: r.fileName,
      fileSizeKb: r.fileSize ? Math.round(r.fileSize / 1024) : null,
      uploadedAt: r.uploadedAt,
    })),
    preferences: preferences ? {
      preferredRole: preferences.preferredRole || 'Any',
      preferredLocation: preferences.preferredLocation || 'Any',
      preferredJobType: preferences.preferredJobType || 'Any',
      workMode: preferences.workMode || 'Any',
      expectedSalary: preferences.expectedSalary || 'Not specified',
      experienceLevel: preferences.experienceLevel || 'Fresher',
    } : null,
    applications: applications.map((a) => ({
      jobTitle: a.job?.title || 'Unknown Job',
      company: a.job?.company?.companyName || 'Unknown Company',
      location: a.job?.location || 'N/A',
      status: a.status,
      appliedAt: a.appliedAt,
    })),
    interviews: interviews.map((i) => ({
      company: i.company?.companyName || 'Unknown Company',
      jobTitle: i.application?.job?.title || 'Job Interview',
      roundName: i.roundName,
      date: i.interviewDate,
      time: i.interviewTime,
      mode: i.mode,
      status: i.status,
      result: i.result,
    })),
    offers: offers.map((o) => ({
      company: o.company?.companyName || 'Unknown Company',
      position: o.position,
      salary: o.salary,
      location: o.location,
      status: o.status,
      joiningDate: o.joiningDate,
      offerExpiry: o.offerExpiry,
    })),
    placements: placements.map((p) => ({
      company: p.company?.companyName || 'Unknown Company',
      position: p.position,
      package: p.package,
      placementDate: p.placementDate,
      status: p.status,
    })),
    savedJobs: savedJobs.map((sj) => ({
      title: sj.job?.title,
      company: sj.job?.company?.companyName,
      deadline: sj.job?.deadline,
      location: sj.job?.location,
    })),
    campusDrives: driveRegistrations.map((d) => ({
      driveTitle: d.drive?.driveTitle,
      company: d.drive?.company?.companyName,
      date: d.drive?.driveDate,
      mode: d.drive?.mode,
      venue: d.drive?.venue,
      registrationStatus: d.status,
      eligibilityStatus: d.eligibilityStatus,
    })),
    activeJobsInPortal: recommendedOpenJobs.map((j) => ({
      title: j.title,
      company: j.company?.companyName,
      location: j.location,
      jobType: j.jobType,
      workMode: j.workMode,
      salary: j.salaryMin && j.salaryMax ? `₹${j.salaryMin} - ₹${j.salaryMax}` : 'Disclosed during drive',
      deadline: j.deadline,
    })),
    unreadNotifications: recentNotifications.map((n) => ({
      title: n.title,
      message: n.message,
      type: n.type,
    })),
    stats: {
      totalApplications: applications.length,
      activeInterviews: interviews.filter((i) => i.status === 'scheduled').length,
      offersReceived: offers.length,
      skillsCount: skills.length,
      projectsCount: projects.length,
      certificationsCount: certifications.length,
      isPlaced: placements.length > 0 || profile?.placementStatus === 'placed',
      hasResume: resumes.length > 0,
      profileCompletion: profile?.profileCompletion || 0,
    },
  };
}

/**
 * Formats student data into a compact, human-readable prompt block for the LLM.
 * @param {Object} context
 * @returns {string}
 */
function formatStudentContextForPrompt(context) {
  const { student, profile, skills, education, projects, certifications, preferences, applications, interviews, offers, placements, campusDrives, activeJobsInPortal, stats } = context;

  const skillsStr = skills.length
    ? skills.map((s) => `${s.name} (${s.proficiency})`).join(', ')
    : 'No technical skills added yet';

  const eduStr = education.length
    ? education.map((e) => `${e.qualification}: ${e.institute} (${e.cgpaOrPercentage}, Year: ${e.passingYear})`).join('; ')
    : 'No education details recorded';

  const appsStr = applications.length
    ? applications.map((a) => `- ${a.jobTitle} at ${a.company} [Status: ${a.status}]`).join('\n')
    : 'No job applications submitted yet';

  const ivStr = interviews.length
    ? interviews.map((i) => `- ${i.company} (${i.jobTitle}): ${i.roundName} on ${i.date ? new Date(i.date).toLocaleDateString() : 'TBD'} ${i.time || ''} [Mode: ${i.mode}, Status: ${i.status}]`).join('\n')
    : 'No scheduled interviews';

  const offersStr = offers.length
    ? offers.map((o) => `- ${o.position} at ${o.company} (Package/Salary: ${o.salary || 'Negotiable'}, Status: ${o.status})`).join('\n')
    : 'No offers received yet';

  const drivesStr = campusDrives.length
    ? campusDrives.map((d) => `- ${d.driveTitle} by ${d.company} on ${d.date ? new Date(d.date).toLocaleDateString() : 'TBD'} [Reg: ${d.registrationStatus}]`).join('\n')
    : 'No campus drive registrations';

  const jobsAvailableStr = activeJobsInPortal.length
    ? activeJobsInPortal.map((j) => `- ${j.title} at ${j.company} (${j.location}, ${j.jobType}) - Apply by ${new Date(j.deadline).toLocaleDateString()}`).join('\n')
    : 'Check portal jobs page for current listings';

  return `
AUTHENTICATED STUDENT DATABASE RECORDS:
--------------------------------------------------
Student Name: ${student.name}
Email: ${student.email}
Course & Branch: ${profile.course} - ${profile.branch} (Semester: ${profile.semester})
Enrollment Number: ${profile.enrollmentNo}
Academic CGPA: ${profile.cgpa}
Active Backlogs: ${profile.backlogs}
Profile Completion: ${profile.profileCompletion}%
Placement Status: ${stats.isPlaced ? 'PLACED' : 'Not Placed Yet'}
Resume Uploaded: ${stats.hasResume ? 'Yes' : 'No'}

Technical & Professional Skills:
${skillsStr}

Education History:
${eduStr}

Recent Projects (${stats.projectsCount}):
${projects.length ? projects.map((p) => `- ${p.title}: ${p.technologies || 'Various'} (${p.description || 'No description'})`).join('\n') : 'No projects listed'}

Certifications (${stats.certificationsCount}):
${certifications.length ? certifications.map((c) => `- ${c.name} by ${c.issuingOrganization}`).join('\n') : 'No certifications listed'}

Career Preferences:
${preferences ? `Target Role: ${preferences.preferredRole}, Location: ${preferences.preferredLocation}, Work Mode: ${preferences.workMode}, Expected Salary: ${preferences.expectedSalary}` : 'Not set'}

Job Applications Summary (${stats.totalApplications} Total):
${appsStr}

Interviews (${interviews.length}):
${ivStr}

Placement Offers (${offers.length}):
${offersStr}

Registered Campus Drives (${campusDrives.length}):
${drivesStr}

Active Job Openings in CareerConnect:
${jobsAvailableStr}
--------------------------------------------------`;
}

module.exports = {
  classifyQuestion,
  getStudentContext,
  formatStudentContextForPrompt,
};
