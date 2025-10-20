const mongoose = require('mongoose');

const LessonSchema = new mongoose.Schema({
  // Asosiy ma’lumotlar
  title: { type: String, required: true, trim: true },
  description: { type: String },
  type: { 
    type: String, 
    enum: ['video'], // faqat video
    default: 'video',
    required: true 
  },

  // Bog‘lanishlar
  course: { type: mongoose.Schema.Types.ObjectId, ref: 'Course', required: true },
  module: { type: mongoose.Schema.Types.ObjectId, ref: 'Module' },
  teacher: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },

  // Video kontent
  videoUrl: { type: String, required: true }, // Asosiy video URL
  thumbnail: { type: String }, // Video uchun rasm
  duration: { type: Number, default: 0 }, // daqiqalarda davomiylik
  previewDuration: { type: Number, default: 0 }, // tekin preview uchun

  // Qo‘shimcha ma’lumotlar
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

// Virtual maydon
LessonSchema.virtual('isVideo').get(function () {
  return this.type === 'video';
});

LessonSchema.set('toJSON', { virtuals: true });

module.exports = mongoose.model('Lesson', LessonSchema);
