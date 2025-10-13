// models/Course.js - YANGILANGAN
const mongoose = require('mongoose');
const slugify = require("slugify");

const CourseSchema = new mongoose.Schema({
  // Asosiy ma'lumotlar
  title: { type: String, required: true, trim: true },
  description: { type: String, default: '' },
  shortDescription: { type: String, maxlength: 200 },
  slug: { type: String, unique: true, lowercase: true },
  category: { type: String, required: true },
  subcategory: { type: String },
  
  // Media
  thumbnail: { type: String },
  introVideo: { type: String },
  
  // O'qituvchi va tarkib
  teacher: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  modules: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Module' }], // ✅ MODULLAR QO'SHILDI
  lessons: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Lesson' }],
  
  // Narx
  price: {
    amount: { type: Number, default: 0 },
    currency: { type: String, default: 'USD' },
    isFree: { type: Boolean, default: true }
  },
  
  // Daraja va talablar
  level: { 
    type: String, 
    enum: ['beginner', 'intermediate', 'advanced', 'all'], 
    default: 'all' 
  },
  learningOutcomes: [String],
  requirements: [String],
  
  // Statistika
  enrollmentCount: { type: Number, default: 0 },
  rating: {
    average: { type: Number, default: 0, min: 0, max: 5 },
    count: { type: Number, default: 0 }
  },
  
  // Davomiylik
  duration: {
    totalHours: { type: Number, default: 0 },
    totalLessons: { type: Number, default: 0 }
  },
  
  // Holat
  status: { 
    type: String, 
    enum: ['draft', 'published', 'archived'], 
    default: 'draft' 
  },
  isDeleted: { type: Boolean, default: false },
  isCompleted: { type: Boolean, default: false },
  
  // Meta ma'lumotlar
  tags: [String],
  meta: {
    keywords: [String],
    language: { type: String, default: 'uz' }
  },
  
  // Sana
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
  publishedAt: Date,
  deletedAt: Date
});

// Slug avtomatik generatsiya - TAKRORLANMAS
CourseSchema.pre("save", async function (next) {
  if (!this.slug && this.title) {
    let baseSlug = slugify(this.title, { lower: true, strict: true });
    let slug = baseSlug;
    let counter = 1;
    
    // Takrorlanmas slug yaratish
    while (true) {
      const existingCourse = await mongoose.model('Course').findOne({ slug });
      if (!existingCourse) break;
      
      slug = `${baseSlug}-${counter}`;
      counter++;
    }
    
    this.slug = slug;
  }
  next();
});

// Avtomatik updatedAt yangilash
CourseSchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  next();
});

// Virtual maydonlar
CourseSchema.virtual('moduleCount').get(function() {
  return this.modules ? this.modules.length : 0;
});

CourseSchema.virtual('totalLessonCount').get(function() {
  return this.lessons ? this.lessons.length : 0;
});

// JSON ga virtual maydonlarni qo'shish
CourseSchema.set('toJSON', { virtuals: true });

// Model yaratish
const Course = mongoose.model('Course', CourseSchema);

module.exports = Course;