const mongoose = require('mongoose');

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
  lessons: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Lesson' }],
  
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
  
  // Sana
  createdAt: { type: Date, default: Date.now },
  publishedAt: Date,
  updatedAt: { type: Date, default: Date.now }
});

// updatedAt avtomatik yangilanishi
CourseSchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  next();
});

// Model yaratish
const Course = mongoose.model('Course', CourseSchema);

module.exports = Course;
