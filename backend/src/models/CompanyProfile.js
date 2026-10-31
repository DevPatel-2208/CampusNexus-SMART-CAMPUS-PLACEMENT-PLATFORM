const mongoose = require('mongoose');

const companyProfileSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, unique: true },
  companyName: { type: String, required: true, trim: true },
  industry: { type: String, default: null },
  website: { type: String, default: null },
  email: { type: String, required: true, trim: true },
  phone: { type: String, default: null },
  address: { type: String, default: null },
  city: { type: String, default: null },
  description: { type: String, default: null },
  logo: { type: String, default: null },
  verificationStatus: { type: String, enum: ['pending', 'verified', 'rejected', 'suspended'], default: 'pending' },
  legacyId: { type: Number, default: null },
}, { timestamps: true });

module.exports = mongoose.model('CompanyProfile', companyProfileSchema);
