const mongoose = require('mongoose');

const DRIVE_STATUSES = ['upcoming', 'registration_open', 'registration_closed', 'ongoing', 'completed', 'cancelled'];
const DRIVE_MODES = ['Online', 'Offline', 'Hybrid'];

const driveSchema = new mongoose.Schema({
  company: { type: mongoose.Schema.Types.ObjectId, ref: 'CompanyProfile', required: true },
  job: { type: mongoose.Schema.Types.ObjectId, ref: 'Job', default: null },
  driveTitle: { type: String, required: true, maxlength: 180 },
  driveType: { type: String, default: null },
  description: { type: String, default: null },
  driveDate: { type: Date, required: true },
  startTime: { type: String, default: null },
  endTime: { type: String, default: null },
  registrationStart: { type: Date, default: null },
  registrationEnd: { type: Date, default: null },
  venue: { type: String, default: null },
  mode: { type: String, enum: DRIVE_MODES, default: 'Offline' },
  status: { type: String, enum: DRIVE_STATUSES, default: 'upcoming' },
  maxStudents: { type: Number, default: null },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
  eligibility: {
    minCgpa: { type: Number, default: 0 },
    maxBacklogs: { type: Number, default: 10 },
    allowedBranches: { type: String, default: null },
    allowedCourses: { type: String, default: null },
    passingYear: { type: Number, default: null },
    requiredExperience: { type: String, default: null },
    requiredSkills: { type: String, default: null },
  },
  legacyId: { type: Number, default: null },
}, { timestamps: true });
driveSchema.index({ company: 1 });

const driveRegSchema = new mongoose.Schema({
  drive: { type: mongoose.Schema.Types.ObjectId, ref: 'PlacementDrive', required: true },
  student: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  eligibilityStatus: { type: String, enum: ['eligible', 'not_eligible'], default: 'eligible' },
  status: { type: String, enum: ['registered', 'shortlisted', 'rejected', 'selected'], default: 'registered' },
  legacyId: { type: Number, default: null },
}, { timestamps: { createdAt: 'registeredAt', updatedAt: false } });
driveRegSchema.index({ drive: 1, student: 1 }, { unique: true });

const interviewSchema = new mongoose.Schema({
  application: { type: mongoose.Schema.Types.ObjectId, ref: 'Application', required: true },
  company: { type: mongoose.Schema.Types.ObjectId, ref: 'CompanyProfile', required: true },
  student: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  roundName: { type: String, enum: ['Technical Round', 'HR Round', 'Final Round', 'Other'], default: 'Technical Round' },
  interviewDate: { type: Date, required: true },
  interviewTime: { type: String, required: true },
  mode: { type: String, enum: ['Online', 'Offline', 'Hybrid', 'Telephonic', 'Video'], default: 'Offline' },
  meetingLink: { type: String, default: null },
  location: { type: String, default: null },
  interviewer: { type: String, default: null },
  notes: { type: String, default: null },
  status: { type: String, enum: ['scheduled', 'completed', 'cancelled', 'rescheduled'], default: 'scheduled' },
  result: { type: String, enum: ['Pending', 'Selected', 'Rejected', 'On Hold'], default: 'Pending' },
  legacyId: { type: Number, default: null },
}, { timestamps: true });
interviewSchema.index({ student: 1 });
interviewSchema.index({ company: 1 });

module.exports = {
  PlacementDrive: mongoose.model('PlacementDrive', driveSchema),
  DriveRegistration: mongoose.model('DriveRegistration', driveRegSchema),
  Interview: mongoose.model('Interview', interviewSchema),
  DRIVE_STATUSES, DRIVE_MODES,
};
