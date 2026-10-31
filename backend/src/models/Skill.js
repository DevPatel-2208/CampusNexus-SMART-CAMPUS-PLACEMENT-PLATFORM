const mongoose = require('mongoose');

const skillSchema = new mongoose.Schema({
  skillName: { type: String, required: true, unique: true, trim: true },
  category: { type: String, default: null },
  legacyId: { type: Number, default: null },
}, { timestamps: true });

const studentSkillSchema = new mongoose.Schema({
  student: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  skill: { type: mongoose.Schema.Types.ObjectId, ref: 'Skill', required: true },
  proficiency: { type: String, enum: ['Beginner', 'Intermediate', 'Advanced', 'Expert'], default: 'Intermediate' },
  legacyId: { type: Number, default: null },
}, { timestamps: true });
studentSkillSchema.index({ student: 1, skill: 1 }, { unique: true });

module.exports = {
  Skill: mongoose.model('Skill', skillSchema),
  StudentSkill: mongoose.model('StudentSkill', studentSkillSchema),
};
