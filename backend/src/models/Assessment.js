const mongoose = require('mongoose');

const assessmentSchema = new mongoose.Schema({
  company: { type: mongoose.Schema.Types.ObjectId, ref: 'CompanyProfile', required: true },
  job: { type: mongoose.Schema.Types.ObjectId, ref: 'Job', default: null },
  title: { type: String, required: true, maxlength: 180 },
  description: { type: String, default: null },
  durationMinutes: { type: Number, required: true, default: 30, min: 1, max: 600 },
  totalMarks: { type: Number, required: true, default: 100, min: 1, max: 1000 },
  marksPerQuestion: { type: Number, default: 1 },
  numQuestions: { type: Number, default: 10, min: 1, max: 50 },
  difficulty: { type: String, enum: ['Easy', 'Medium', 'Hard', 'Mixed'], default: 'Medium' },
  categories: { type: String, default: 'Technical' },
  technology: { type: String, default: null },
  passingPercentage: { type: Number, default: 60, min: 0, max: 100 },
  negativeMarking: { type: Boolean, default: false },
  negativeMarks: { type: Number, default: 0, min: 0, max: 10 },
  status: { type: String, enum: ['active', 'inactive', 'draft'], default: 'active' },
  legacyId: { type: Number, default: null },
}, { timestamps: true });

const questionSchema = new mongoose.Schema({
  assessment: { type: mongoose.Schema.Types.ObjectId, ref: 'Assessment', required: true },
  question: { type: String, required: true },
  questionType: { type: String, enum: ['MCQ', 'True/False', 'Technical', 'Aptitude', 'Logical Reasoning'], default: 'MCQ' },
  optionA: { type: String, default: null },
  optionB: { type: String, default: null },
  optionC: { type: String, default: null },
  optionD: { type: String, default: null },
  correctAnswer: { type: String, enum: ['A', 'B', 'C', 'D'], required: true },
  marks: { type: Number, default: 1 },
  legacyId: { type: Number, default: null },
}, { timestamps: true });
questionSchema.index({ assessment: 1 });

const attemptSchema = new mongoose.Schema({
  assessment: { type: mongoose.Schema.Types.ObjectId, ref: 'Assessment', required: true },
  student: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  startedAt: { type: Date, default: Date.now },
  submittedAt: { type: Date, default: null },
  score: { type: Number, default: 0 },
  percentage: { type: Number, default: 0 },
  result: { type: String, enum: ['Passed', 'Failed', 'Pending'], default: 'Pending' },
  expiresAt: { type: Date, default: null },
  lastActivityAt: { type: Date, default: null },
  lastHeartbeatAt: { type: Date, default: null },
  integrityStatus: { type: String, enum: ['NORMAL', 'FLAGGED', 'BLOCKED', 'SUBMITTED'], default: 'NORMAL' },
  violationCount: { type: Number, default: 0 },
  questionOrder: { type: [String], default: [] },
  optionOrders: { type: mongoose.Schema.Types.Mixed, default: {} },
  sessionId: { type: String, default: null },
  status: { type: String, enum: ['active', 'submitted'], default: 'active' },
  legacyId: { type: Number, default: null },
}, { timestamps: true });
attemptSchema.index({ assessment: 1, student: 1, status: 1 }, { unique: true, partialFilterExpression: { status: 'active' } });

const answerSchema = new mongoose.Schema({
  attempt: { type: mongoose.Schema.Types.ObjectId, ref: 'AssessmentAttempt', required: true },
  question: { type: mongoose.Schema.Types.ObjectId, ref: 'AssessmentQuestion', required: true },
  selectedAnswer: { type: String, enum: ['A', 'B', 'C', 'D', null], default: null },
  isCorrect: { type: Boolean, default: false },
  marksObtained: { type: Number, default: 0 },
  legacyId: { type: Number, default: null },
}, { timestamps: { createdAt: 'savedAt', updatedAt: false } });
answerSchema.index({ attempt: 1, question: 1 }, { unique: true });

const violationSchema = new mongoose.Schema({
  attempt: { type: mongoose.Schema.Types.ObjectId, ref: 'AssessmentAttempt', required: true },
  student: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  violationType: { type: String, required: true },
  description: { type: String, default: null },
  severity: { type: String, enum: ['LOW', 'MEDIUM', 'HIGH'], default: 'LOW' },
  metadata: { type: mongoose.Schema.Types.Mixed, default: null },
  legacyId: { type: Number, default: null },
}, { timestamps: { createdAt: 'occurredAt', updatedAt: false } });

module.exports = {
  Assessment: mongoose.model('Assessment', assessmentSchema),
  AssessmentQuestion: mongoose.model('AssessmentQuestion', questionSchema),
  AssessmentAttempt: mongoose.model('AssessmentAttempt', attemptSchema),
  AssessmentAnswer: mongoose.model('AssessmentAnswer', answerSchema),
  ExamViolation: mongoose.model('ExamViolation', violationSchema),
};
