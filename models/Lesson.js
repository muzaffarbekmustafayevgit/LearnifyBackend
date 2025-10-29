const mongoose = require('mongoose');

const LessonSchema = new mongoose.Schema({
  // Asosiy ma'lumotlar
  title: { type: String, required: true, trim: true },
  description: { type: String },
  type: { 
    type: String, 
    enum: ['video', 'article', 'quiz'], // Turli xil dars turlari
    default: 'video',
    required: true 
  },

  // Bog'lanishlar
  course: { type: mongoose.Schema.Types.ObjectId, ref: 'Course', required: true },
  module: { type: mongoose.Schema.Types.ObjectId, ref: 'Module' },
  teacher: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },

  // Video kontent - GOOGLE DRIVE INTEGRATSIYASI
  videoUrl: { type: String }, // Google Drive URL
  driveFileId: { type: String }, // Google Drive file ID
  thumbnail: { type: String }, // Video uchun rasm
  duration: { type: Number, default: 0 }, // daqiqalarda davomiylik
  fileSize: { type: Number }, // Fayl hajmi baytlarda
  mimeType: { type: String }, // Fayl turi

  // Qo'shimcha ma'lumotlar
  order: { type: Number, default: 0 },
  lessonNumber: { type: String }, // masalan "1.1"

  // Holat
  status: { 
    type: String, 
    enum: ['draft', 'published', 'archived'], 
    default: 'draft' 
  },
  isFree: { type: Boolean, default: false },
  isDeleted: { type: Boolean, default: false },

  // Statistikalar
  viewCount: { type: Number, default: 0 },
  completionCount: { type: Number, default: 0 },

  // Timestamps
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
  publishedAt: Date
});

// Save vaqtida avtomatik yangilash
LessonSchema.pre('save', function (next) {
  this.updatedAt = Date.now();
  if (this.status === 'published' && !this.publishedAt) {
    this.publishedAt = new Date();
  }
  next();
});

module.exports = mongoose.model('Lesson', LessonSchema);