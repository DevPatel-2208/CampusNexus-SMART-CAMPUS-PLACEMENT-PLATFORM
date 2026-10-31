const mongoose = require('mongoose');

const APP_STATUSES = ['Applied', 'Under Review', 'Shortlisted', 'Assessment', 'Interview', 'Selected', 'Rejected', 'Offer', 'Placed'];

const historySchema = new mongoose.Schema({
  status: { type: String, required: true },
  note: { type: String, default: null },
  by: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
  at: { type: Date, default: Date.now },
}, { _id: false });

const applicationSchema = new mongoose.Schema({
  student: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  job: { type: mongoose.Schema.Types.ObjectId, ref: 'Job', required: true },
  drive: { type: mongoose.Schema.Types.ObjectId, ref: 'PlacementDrive', default: null },
  status: { type: String, enum: APP_STATUSES, default: 'Applied' },
  coverLetter: { type: String, default: null },
  rejectionReason: { type: String, default: null },
  history: { type: [historySchema], default: [] },
  legacyId: { type: Number, default: null },
}, { timestamps: { createdAt: 'appliedAt', updatedAt: 'updatedAt' } });
applicationSchema.index({ job: 1, student: 1 }, { unique: true });
applicationSchema.index({ student: 1 });

const selectionSchema = new mongoose.Schema({
  application: { type: mongoose.Schema.Types.ObjectId, ref: 'Application', required: true, unique: true },
  company: { type: mongoose.Schema.Types.ObjectId, ref: 'CompanyProfile', required: true },
  student: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  selectionStatus: { type: String, enum: ['Selected', 'Rejected', 'On Hold'], required: true },
  remarks: { type: String, default: null },
  legacyId: { type: Number, default: null },
}, { timestamps: { createdAt: 'selectedAt', updatedAt: false } });

const OFFER_STATUSES = ['draft', 'pending', 'issued', 'viewed', 'accepted', 'rejected', 'expired', 'withdrawn'];
const offerSchema = new mongoose.Schema({
  selection: { type: mongoose.Schema.Types.ObjectId, ref: 'Selection', default: null },
  student: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  company: { type: mongoose.Schema.Types.ObjectId, ref: 'CompanyProfile', required: true },
  job: { type: mongoose.Schema.Types.ObjectId, ref: 'Job', required: true },
  position: { type: String, required: true },
  department: { type: String, default: null },
  workMode: { type: String, enum: ['Onsite', 'Hybrid', 'Remote', null], default: null },
  salary: { type: String, default: null },
  joiningDate: { type: Date, default: null },
  location: { type: String, default: null },
  employmentType: { type: String, default: null },
  offerExpiry: { type: Date, default: null },
  issueDate: { type: Date, default: null },
  terms: { type: String, default: null },
  remarks: { type: String, default: null },
  representativeName: { type: String, default: null },
  representativeDesignation: { type: String, default: null },
  offerLetter: { type: String, default: null },
  status: { type: String, enum: OFFER_STATUSES, default: 'pending' },
  studentRejectReason: { type: String, default: null },
  withdrawReason: { type: String, default: null },
  legacyId: { type: Number, default: null },
}, { timestamps: true });
offerSchema.index({ student: 1 });
offerSchema.index({ company: 1 });

const placementSchema = new mongoose.Schema({
  student: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  company: { type: mongoose.Schema.Types.ObjectId, ref: 'CompanyProfile', required: true },
  job: { type: mongoose.Schema.Types.ObjectId, ref: 'Job', required: true },
  offer: { type: mongoose.Schema.Types.ObjectId, ref: 'Offer', default: null },
  position: { type: String, required: true },
  package: { type: String, default: null },
  joiningDate: { type: Date, default: null },
  location: { type: String, default: null },
  placementDate: { type: Date, required: true },
  status: { type: String, enum: ['Placed', 'Joined', 'Not Joined'], default: 'Placed' },
  legacyId: { type: Number, default: null },
}, { timestamps: true });

module.exports = {
  Application: mongoose.model('Application', applicationSchema),
  Selection: mongoose.model('Selection', selectionSchema),
  Offer: mongoose.model('Offer', offerSchema),
  Placement: mongoose.model('Placement', placementSchema),
  APP_STATUSES, OFFER_STATUSES,
};
