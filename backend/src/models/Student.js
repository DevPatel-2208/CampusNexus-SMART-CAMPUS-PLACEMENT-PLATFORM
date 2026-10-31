const mongoose = require('mongoose');

const educationSchema = new mongoose.Schema({
  student: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  qualification: { type: String, enum: ['10th', '12th', 'Diploma', 'Graduation', 'Post Graduation', 'Other'], required: true },
  institute: { type: String, required: true, maxlength: 180 },
  board: { type: String, default: null },
  stream: { type: String, default: null },
  university: { type: String, default: null },
  course: { type: String, default: null },
  branch: { type: String, default: null },
  passingYear: { type: Number, default: null },
  percentage: { type: Number, default: null },
  cgpa: { type: Number, default: null },
  legacyId: { type: Number, default: null },
}, { timestamps: true });
educationSchema.index({ student: 1 });

const projectSchema = new mongoose.Schema({
  student: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  title: { type: String, required: true, maxlength: 180 },
  description: { type: String, default: null },
  technologies: { type: String, default: null },
  projectUrl: { type: String, default: null },
  githubUrl: { type: String, default: null },
  startDate: { type: Date, default: null },
  endDate: { type: Date, default: null },
  legacyId: { type: Number, default: null },
}, { timestamps: true });
projectSchema.index({ student: 1 });

const certificationSchema = new mongoose.Schema({
  student: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  name: { type: String, required: true, maxlength: 180 },
  issuingOrganization: { type: String, required: true, maxlength: 180 },
  issueDate: { type: Date, default: null },
  credentialUrl: { type: String, default: null },
  legacyId: { type: Number, default: null },
}, { timestamps: true });
certificationSchema.index({ student: 1 });

const resumeSchema = new mongoose.Schema({
  student: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  fileName: { type: String, required: true },
  filePath: { type: String, required: true },
  fileType: { type: String, default: null },
  fileSize: { type: Number, default: null },
  legacyId: { type: Number, default: null },
}, { timestamps: { createdAt: 'uploadedAt', updatedAt: false } });
resumeSchema.index({ student: 1 });

const preferenceSchema = new mongoose.Schema({
  student: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, unique: true },
  preferredRole: { type: String, default: null },
  preferredLocation: { type: String, default: null },
  preferredJobType: { type: String, enum: ['Full Time', 'Part Time', 'Internship', 'Fresher', 'Experienced', null], default: null },
  expectedSalary: { type: String, default: null },
  workMode: { type: String, enum: ['Onsite', 'Remote', 'Hybrid', null], default: null },
  experienceLevel: { type: String, default: null },
  legacyId: { type: Number, default: null },
}, { timestamps: true });

const roadmapSchema = new mongoose.Schema({
  student: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  careerGoal: { type: String, required: true, maxlength: 180 },
  description: { type: String, default: null },
  duration: { type: String, default: null },
  items: [{
    skillName: String,
    description: String,
    priority: { type: String, enum: ['High', 'Medium', 'Low'], default: 'Medium' },
    sequenceNo: Number,
    status: { type: String, enum: ['pending', 'in_progress', 'completed'], default: 'pending' },
    legacyId: Number,
  }],
  legacyId: { type: Number, default: null },
}, { timestamps: true });
roadmapSchema.index({ student: 1 });

const skillGapSchema = new mongoose.Schema({
  student: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  job: { type: mongoose.Schema.Types.ObjectId, ref: 'Job', required: true },
  skill: { type: mongoose.Schema.Types.ObjectId, ref: 'Skill', required: true },
  currentLevel: { type: String, default: null },
  requiredLevel: { type: String, default: null },
  gapStatus: { type: String, enum: ['matched', 'missing', 'learning'], default: 'missing' },
  legacyId: { type: Number, default: null },
}, { timestamps: true });

module.exports = {
  Education: mongoose.model('Education', educationSchema),
  Project: mongoose.model('Project', projectSchema),
  Certification: mongoose.model('Certification', certificationSchema),
  Resume: mongoose.model('Resume', resumeSchema),
  CareerPreference: mongoose.model('CareerPreference', preferenceSchema),
  CareerRoadmap: mongoose.model('CareerRoadmap', roadmapSchema),
  SkillGap: mongoose.model('SkillGap', skillGapSchema),
};
