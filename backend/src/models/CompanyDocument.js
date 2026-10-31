const mongoose = require('mongoose');

const companyDocumentSchema = new mongoose.Schema({
  company: { type: mongoose.Schema.Types.ObjectId, ref: 'CompanyProfile', required: true },
  documentType: { type: String, default: null },
  documentName: { type: String, required: true },
  documentPath: { type: String, required: true },
  legacyId: { type: Number, default: null },
}, { timestamps: { createdAt: 'uploadedAt', updatedAt: false } });

module.exports = mongoose.model('CompanyDocument', companyDocumentSchema);
