const mongoose = require('mongoose');

const studentProfileSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, unique: true },
  enrollmentNo: { type: String, default: null },
  phone: { type: String, default: null },
  dob: { type: Date, default: null },
  gender: { type: String, enum: ['Male', 'Female', 'Other', null], default: null },
  address: { type: String, default: null },
  city: { type: String, default: null },
  course: { type: String, default: null },
  branch: { type: String, default: null },
  semester: { type: String, default: null },
  cgpa: { type: Number, default: null, min: 0, max: 10 },
  passingYear: { type: Number, default: null, min: 1950, max: 2100 },
  backlogs: { type: Number, default: 0, min: 0, max: 50 },
  placementStatus: { type: String, enum: ['not_placed', 'placed'], default: 'not_placed' },
  profileCompletion: { type: Number, default: 20, min: 0, max: 100 },
  profilePhoto: { type: String, default: null },
  about: { type: String, default: null },
  legacyId: { type: Number, default: null },
}, { timestamps: true });

/** Parity with PHP calculateProfileCompletion: weighted completeness 0–100. */
studentProfileSchema.methods.recalcCompletion = function () {
  const weights = {
    enrollmentNo: 10,
    phone: 8,
    dob: 5,
    gender: 3,
    address: 5,
    city: 5,
    course: 10,
    branch: 10,
    semester: 5,
    cgpa: 12,
    passingYear: 8,
    backlogs: 4,
    about: 10,
  };
  let score = 0;
  for (const [k, w] of Object.entries(weights)) {
    if (this[k] !== null && this[k] !== undefined && this[k] !== '') {
      score += w;
    }
  }
  // Profile photo gives 5 bonus points
  if (this.profilePhoto) {
    score += 5;
  }
  // If student has completed all primary academic, personal & contact fields (reaches 95+),
  // they have fulfilled all requirements: grant 100% completion!
  if (score >= 95) {
    score = 100;
  }
  this.profileCompletion = Math.min(100, score);
  return this.profileCompletion;
};

module.exports = mongoose.model('StudentProfile', studentProfileSchema);
