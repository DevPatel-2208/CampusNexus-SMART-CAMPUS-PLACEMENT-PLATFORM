const mongoose = require('mongoose');

const JOB_TYPES = ['Full Time', 'Part Time', 'Internship', 'Fresher', 'Experienced'];
const WORK_MODES = ['Onsite', 'Remote', 'Hybrid'];

const jobSchema = new mongoose.Schema({
  company: { type: mongoose.Schema.Types.ObjectId, ref: 'CompanyProfile', required: true },
  title: { type: String, required: true, trim: true, maxlength: 180 },
  description: { type: String, required: true },
  qualification: { type: String, default: null },
  experience: { type: String, default: 'Fresher' },
  salaryMin: { type: Number, default: null },
  salaryMax: { type: Number, default: null },
  location: { type: String, required: true },
  jobType: { type: String, enum: JOB_TYPES, required: true },
  workMode: { type: String, enum: WORK_MODES, required: true },
  vacancies: { type: Number, default: 1, min: 1 },
  internshipDuration: { type: String, default: null },
  stipend: { type: String, default: null },
  deadline: { type: Date, required: true },
  status: { type: String, enum: ['Open', 'Closed'], default: 'Open' },
  approvalStatus: { type: String, enum: ['pending', 'approved', 'rejected'], default: 'pending' },
  rejectionReason: { type: String, default: null },
  legacyId: { type: Number, default: null },
}, { timestamps: true });

jobSchema.index({ approvalStatus: 1 });
jobSchema.index({ company: 1 });
jobSchema.index({ status: 1, deadline: 1 });

const jobSkillSchema = new mongoose.Schema({
  job: { type: mongoose.Schema.Types.ObjectId, ref: 'Job', required: true },
  skill: { type: mongoose.Schema.Types.ObjectId, ref: 'Skill', required: true },
  isRequired: { type: Boolean, default: true },
});
jobSkillSchema.index({ job: 1, skill: 1 }, { unique: true });

const savedJobSchema = new mongoose.Schema({
  student: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  job: { type: mongoose.Schema.Types.ObjectId, ref: 'Job', required: true },
  legacyId: { type: Number, default: null },
}, { timestamps: { createdAt: 'savedAt', updatedAt: false } });
savedJobSchema.index({ student: 1, job: 1 }, { unique: true });

const jobAlertSchema = new mongoose.Schema({
  student: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  roleKeyword: { type: String, required: true, default: '' },
  location: { type: String, default: '' },
  minSalary: { type: Number, default: null },
  isActive: { type: Boolean, default: true },
  legacyId: { type: Number, default: null },
}, { timestamps: true });
jobAlertSchema.index({ student: 1 });

module.exports = {
  Job: mongoose.model('Job', jobSchema),
  JobSkill: mongoose.model('JobSkill', jobSkillSchema),
  SavedJob: mongoose.model('SavedJob', savedJobSchema),
  JobAlert: mongoose.model('JobAlert', jobAlertSchema),
  JOB_TYPES, WORK_MODES,
};
