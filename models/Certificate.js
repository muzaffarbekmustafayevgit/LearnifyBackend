const mongoose = require('mongoose');

const CertificateSchema = new mongoose.Schema({
  student: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  course: { type: mongoose.Schema.Types.ObjectId, ref: 'Course', required: true },
  filePath: { type: String, required: true },
  issuedAt: { type: Date, default: Date.now },
  conditionMet: { type: Boolean, default: false } // progress ≥ 70% bo‘lsa true
});


CertificateSchema.index({ student: 1, course: 1 }, { unique: true });

module.exports = mongoose.model('Certificate', CertificateSchema);
