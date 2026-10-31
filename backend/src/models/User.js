const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true, minlength: 3, maxlength: 120 },
  email: { type: String, required: true, unique: true, lowercase: true, trim: true, maxlength: 190 },
  password: { type: String, required: true, select: false },
  role: { type: String, enum: ['student', 'tpo', 'company'], required: true },
  status: { type: String, enum: ['active', 'inactive', 'blocked'], default: 'active' },
  emailVerifiedAt: { type: Date, default: null },
  lastLogin: { type: Date, default: null },
  firstLogin: { type: Boolean, default: true }, // true until the user's first successful login
  tokenVersion: { type: Number, default: 0 },
  // Separate counter for refresh-token rotation, so concurrent refresh requests
  // (and multiple tabs) can be tolerated with a short grace window without
  // weakening tokenVersion-based revocation (logout, password change, blocking).
  refreshVersion: { type: Number, default: 0 },
  refreshRotatedAt: { type: Date, default: null },
  legacyId: { type: Number, default: null },
}, { timestamps: true });

userSchema.index({ role: 1 });
userSchema.index({ status: 1 });

module.exports = mongoose.model('User', userSchema);
