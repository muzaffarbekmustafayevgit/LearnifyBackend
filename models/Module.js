const mongoose = require('mongoose');
const ModuleSchema = new mongoose.Schema({
  // Asosiy ma'lumotlar
  title: { type: String, required: true, trim: true },
  description: { type: String, default: '' },
  shortDescription: { type: String, maxlength: 150 },
  
  // Bog'lanishlar
  course: { type: mongoose.Schema.Types.ObjectId, ref: 'Course', required: true },
  lessons: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Lesson' }],
  
  // Tartib va tashkil etish
  order: { type: Number, default: 0 },
  moduleNumber: { type: String }, // "01", "02" yoki "A", "B"
  
  // Media va resurslar
  thumbnail: { type: String },
  resources: [{
      title: String,
      type: { type: String, enum: ['pdf', 'doc', 'zip', 'link'] },
      url: String,
      description: String,
      uploadedAt: { type: Date, default: Date.now }
  }],
  
  // Davomiylik va narx
  estimatedDuration: { type: Number, default: 0 }, // minutlarda
  isFreePreview: { type: Boolean, default: false }, // Tekin ko'rish uchun
  
  // O'quv maqsadlari
  learningObjectives: [String],
  keyConcepts: [String],
  
  // Progress tracking
  progressWeight: { type: Number, default: 0 }, // Kurs progressidagi og'irlik
  completionRequirements: {
      type: String, 
      enum: ['all-lessons', 'quiz-passed', 'assignment-submitted'],
      default: 'all-lessons'
  },
  
  // Meta ma'lumotlar
  tags: [String],
  prerequisites: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Module' }],
  
  // Modul holati
  isPublished: { type: Boolean, default: false },
  publishedAt: Date,
  isDeleted: { type: Boolean, default: false },
  
  // Sana va vaqt
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

// Avtomatik updatedAt yangilash
ModuleSchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  next();
});

// Tartib bo'yicha tartiblash
ModuleSchema.index({ course: 1, order: 1 });

// Virtual maydonlar
ModuleSchema.virtual('lessonCount').get(function() {
  return this.lessons ? this.lessons.length : 0;
});

ModuleSchema.virtual('totalDuration').get(function() {
  // Lessons dan davomiylikni yig'ish (agar Lesson modelida duration bo'lsa)
  return this.estimatedDuration;
});

// JSON ga virtual maydonlarni qo'shish
ModuleSchema.set('toJSON', { virtuals: true });
module.exports = mongoose.model('Module', ModuleSchema);
