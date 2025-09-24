const mongoose = require('mongoose');

const CertificateSchema = new mongoose.Schema({
  // Asosiy bog'lanishlar
  student: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  course: { type: mongoose.Schema.Types.ObjectId, ref: 'Course', required: true },
  teacher: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }, // O'qituvchi

  // Sertifikat ma'lumotlari
  certificateId: { type: String, required: true, unique: true }, // Unique ID (CERT-12345)
  title: { type: String, required: true }, // Sertifikat nomi
  description: { type: String }, // Qisqa tavsif
  
  // Fayl ma'lumotlari
  filePath: { type: String, required: true }, // Asosiy fayl
  fileUrl: { type: String }, // To'liq URL
  fileType: { type: String, default: 'pdf' }, // pdf, png, jpg
  fileSize: { type: Number }, // Fayl hajmi (bytes)
  thumbnailUrl: { type: String }, // Kichik ko'rinish

  // Sertifikat parametrlari
  template: { type: String, default: 'default' }, // Sertifikat shabloni
  language: { type: String, default: 'en' }, // Sertifikat tili
  format: { type: String, enum: ['digital', 'printable', 'both'], default: 'both' },

  // Baholash va progress
  finalScore: { type: Number }, // Yakuniy ball
  maxScore: { type: Number }, // Maksimal ball
  progressPercentage: { type: Number }, // Kurs progressi
  grade: { type: String }, // A, B, C, Distinction, etc.
  performanceLevel: { 
    type: String, 
    enum: ['excellent', 'very-good', 'good', 'satisfactory', 'poor'] 
  },

  // Shartlar va tekshiruv
  conditionMet: { type: Boolean, default: false },
  conditions: {
    minProgress: { type: Number, default: 70 }, // Minimal progress %
    minScore: { type: Number, default: 60 }, // Minimal ball
    completeAllQuizzes: { type: Boolean, default: false },
    completeAssignments: { type: Boolean, default: false },
    timeLimit: { type: Number } // Kursni tugatish muddati (kunlarda)
  },
  requirementsMet: {
    progress: { type: Boolean, default: false },
    score: { type: Boolean, default: false },
    quizzes: { type: Boolean, default: false },
    assignments: { type: Boolean, default: false },
    time: { type: Boolean, default: true }
  },

  // Qo'shimcha ma'lumotlar
  issueNumber: { type: String }, // Sertifikat seriya raqami
  accreditation: {
    isAccredited: { type: Boolean, default: false },
    accreditor: { type: String }, // Akkreditatsiya beruvchi
    accreditationId: { type: String }
  },
  skills: [{ type: String }], // Sertifikatda ko'rsatilgan ko'nikmalar
  keywords: [{ type: String }], // Qidiruv uchun kalit so'zlar

  // Vaqt ma'lumotlari
  issuedAt: { type: Date, default: Date.now },
  validFrom: { type: Date, default: Date.now },
  validUntil: { type: Date }, // Amal qilish muddati
  expiresAt: { type: Date }, // Muddatli tugash vaqti
  renewedAt: { type: Date }, // Yangilangan vaqt

  // Holat va boshqarish
  status: { 
    type: String, 
    enum: ['issued', 'revoked', 'expired', 'suspended', 'renewed'], 
    default: 'issued' 
  },
  isPublic: { type: Boolean, default: true }, // Jamoat ko'rinishi
  isVerifiable: { type: Boolean, default: true }, // Onlayn tekshirish
  isDownloadable: { type: Boolean, default: true },

  // Tekshirish ma'lumotlari
  verification: {
    code: { type: String, unique: true }, // Tekshirish kodi
    qrCodeUrl: { type: String }, // QR kod URL
    verificationUrl: { type: String }, // Tekshirish sahifasi
    views: { type: Number, default: 0 }, // Necha marta tekshirilgan
    lastVerified: { type: Date } // Oxirgi tekshirilgan vaqt
  },

  // Metadata
  metadata: {
    issuer: { type: String, default: 'EduPlatform' }, // Beruvchi
    issuerLogo: { type: String }, // Beruvchi logotipi
    signatory: {
      name: { type: String }, // Imzo qo'ygan shaxs
      title: { type: String }, // Lavozimi
      signature: { type: String } // Imzo rasmi
    },
    courseDuration: { type: Number }, // Kurs davomiyligi (soatlarda)
    completionDate: { type: Date } // Kurs tugatilgan sana
  },

  // Statistika
  downloadCount: { type: Number, default: 0 },
  shareCount: { type: Number, default: 0 },
  viewCount: { type: Number, default: 0 },

  // Audit trail
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }, // Kim tomonidan yaratilgan
  revokedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }, // Kim tomonidan bekor qilingan
  revokedAt: { type: Date },
  revocationReason: { type: String },

  updatedAt: { type: Date, default: Date.now }
});

// Indexlar
CertificateSchema.index({ student: 1, course: 1 }, { unique: true });
CertificateSchema.index({ certificateId: 1 }, { unique: true });
CertificateSchema.index({ 'verification.code': 1 }, { unique: true });
CertificateSchema.index({ issuedAt: 1 });
CertificateSchema.index({ status: 1 });
CertificateSchema.index({ validUntil: 1 });
CertificateSchema.index({ student: 1, issuedAt: -1 });
module.exports = mongoose.model('Certificate', CertificateSchema);
