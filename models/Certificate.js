const mongoose = require('mongoose');

const CertificateSchema = new mongoose.Schema({
  student: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  course: { type: mongoose.Schema.Types.ObjectId, ref: 'Course', required: true },
  filePath: { type: String, required: true }, // sertifikat fayl manzili (PDF)
  issuedAt: { type: Date, default: Date.now }
});

CertificateSchema.index({ student: 1, course: 1 }, { unique: true });

module.exports = mongoose.model('Certificate', CertificateSchema);
