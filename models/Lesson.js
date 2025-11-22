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

  // ✅ LOCAL FILE STORAGE - Google Drive o'rniga
  videoUrl: { type: String }, // Local server URL: /uploads/videos/filename.mp4
  localFilePath: { type: String }, // Serverdagi to'liq fayl yo'li
  fileName: { type: String }, // Asl fayl nomi
  thumbnail: { type: String }, // Video uchun rasm
  duration: { type: Number, default: 0 }, // daqiqalarda davomiylik
  fileSize: { type: Number }, // Fayl hajmi baytlarda
  mimeType: { type: String }, // Fayl turi

  // ❌ GOOGLE DRIVE FIELDLARI O'CHIRILDI
  // driveFileId: { type: String }, // Google Drive file ID - OLIB TASHLANDI

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
  publishedAt: Date,
  deletedAt: Date // Soft delete uchun
});

// Save vaqtida avtomatik yangilash
LessonSchema.pre('save', function (next) {
  this.updatedAt = Date.now();
  
  // Published holatga o'tganda publishedAt ni o'rnatish
  if (this.status === 'published' && !this.publishedAt) {
    this.publishedAt = new Date();
  }
  
  // Soft delete uchun
  if (this.isDeleted && !this.deletedAt) {
    this.deletedAt = new Date();
  }
  
  next();
});

// Virtual field - video mavjudligini tekshirish
LessonSchema.virtual('isVideoAvailable').get(function() {
  return !!(this.videoUrl && this.localFilePath);
});

// Virtual field - video duration formatda
LessonSchema.virtual('formattedDuration').get(function() {
  if (!this.duration) return '0:00';
  
  const minutes = Math.floor(this.duration / 60);
  const seconds = this.duration % 60;
  return `${minutes}:${seconds.toString().padStart(2, '0')}`;
});

// Virtual field - file size formatda
LessonSchema.virtual('formattedFileSize').get(function() {
  if (!this.fileSize) return '0 MB';
  
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(this.fileSize) / Math.log(1024));
  return Math.round(this.fileSize / Math.pow(1024, i) * 100) / 100 + ' ' + sizes[i];
});

// JSON ga virtual fieldlarni qo'shish
LessonSchema.set('toJSON', { virtuals: true });

// Statik metodlar
LessonSchema.statics.findByCourse = function(courseId) {
  return this.find({ 
    course: courseId, 
    isDeleted: false,
    status: 'published' 
  }).sort({ order: 1 });
};

LessonSchema.statics.findByModule = function(moduleId) {
  return this.find({ 
    module: moduleId, 
    isDeleted: false,
    status: 'published' 
  }).sort({ order: 1 });
};

LessonSchema.statics.findPublished = function() {
  return this.find({ 
    isDeleted: false, 
    status: 'published' 
  });
};

// Instance metodlar
LessonSchema.methods.incrementViews = function() {
  this.viewCount += 1;
  return this.save();
};

LessonSchema.methods.incrementCompletions = function() {
  this.completionCount += 1;
  return this.save();
};

LessonSchema.methods.softDelete = function() {
  this.isDeleted = true;
  this.status = 'archived';
  this.deletedAt = new Date();
  return this.save();
};

LessonSchema.methods.restore = function() {
  this.isDeleted = false;
  this.status = 'published';
  this.deletedAt = null;
  return this.save();
};

// Indexlar - performance uchun
LessonSchema.index({ course: 1, order: 1 });
LessonSchema.index({ module: 1, order: 1 });
LessonSchema.index({ teacher: 1, createdAt: -1 });
LessonSchema.index({ status: 1, isDeleted: 1 });
LessonSchema.index({ isDeleted: 1 });

module.exports = mongoose.model('Lesson', LessonSchema);