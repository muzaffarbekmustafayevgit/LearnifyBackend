const mongoose = require('mongoose');
const ProgressSchema = new mongoose.Schema({
  // Asosiy bog'lanishlar
  student: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  course: { type: mongoose.Schema.Types.ObjectId, ref: 'Course', required: true },
  module: { type: mongoose.Schema.Types.ObjectId, ref: 'Module' }, // Joriy modul

  // Progress tracking
  completedLessons: [{
    lesson: { type: mongoose.Schema.Types.ObjectId, ref: 'Lesson' },
    completedAt: { type: Date, default: Date.now },
    timeSpent: { type: Number, default: 0 }, // minutlarda
    score: { type: Number }, // Test/quiz uchun
    maxScore: { type: Number }, // Maksimal ball
    attempts: { type: Number, default: 1 }, // Urinishlar soni
    bestScore: { type: Number }, // Eng yaxshi natija
    status: { 
      type: String, 
      enum: ['completed', 'in-progress', 'not-started', 'failed'], 
      default: 'completed' 
    }
  }],
  
  // Modullar progressi
  completedModules: [{
    module: { type: mongoose.Schema.Types.ObjectId, ref: 'Module' },
    completedAt: { type: Date, default: Date.now },
    progress: { type: Number, default: 0 }
  }],

  // Umumiy progress
  progress: { type: Number, default: 0 }, // Foizda
  totalLessons: { type: Number, default: 0 }, // Kursdagi jami darslar
  completedLessonsCount: { type: Number, default: 0 },
  
  // Vaqt ma'lumotlari
  startedAt: { type: Date, default: Date.now },
  lastAccessed: { type: Date, default: Date.now },
  completedAt: { type: Date }, // Kurs tugatilgan vaqt
  estimatedCompletion: { type: Date }, // Taxminiy tugatish vaqti
  
  // Faollik ma'lumotlari
  timeSpent: { type: Number, default: 0 }, // Umumiy vaqt (minutlarda)
  averageTimePerLesson: { type: Number, default: 0 },
  lastLessonCompleted: { type: mongoose.Schema.Types.ObjectId, ref: 'Lesson' },
  
  // Test va baholar
  overallScore: { type: Number, default: 0 }, // O'rtacha ball
  totalPointsEarned: { type: Number, default: 0 },
  totalPointsAvailable: { type: Number, default: 0 },
  quizPerformance: {
    averageScore: { type: Number, default: 0 },
    totalQuizzes: { type: Number, default: 0 },
    passedQuizzes: { type: Number, default: 0 },
    failedQuizzes: { type: Number, default: 0 }
  },
  
  // Kurs holati
  status: { 
    type: String, 
    enum: ['not-started', 'in-progress', 'completed', 'paused', 'dropped'], 
    default: 'not-started' 
  },
  isFavorite: { type: Boolean, default: false },
 
  
  // Certificate ma'lumotlari
  certificate: {
    earned: { type: Boolean, default: false },
    certificateId: { type: String },
    issuedAt: { type: Date },
    downloadUrl: { type: String },
    requirementsMet: { 
      minProgress: { type: Boolean, default: false },
      minScore: { type: Boolean, default: false },
      allQuizzesPassed: { type: Boolean, default: false }
    }
  },
  
  // Qayta ko'rish va takrorlash
  revisions: [{
    lesson: { type: mongoose.Schema.Types.ObjectId, ref: 'Lesson' },
    revisitedAt: { type: Date, default: Date.now },
    count: { type: Number, default: 1 }
  }],
  
  // User notes va bookmarklar
  notes: [{
    lesson: { type: mongoose.Schema.Types.ObjectId, ref: 'Lesson' },
    content: { type: String, required: true },
    createdAt: { type: Date, default: Date.now },
    updatedAt: { type: Date, default: Date.now }
  }],
  
  bookmarks: [{
    lesson: { type: mongoose.Schema.Types.ObjectId, ref: 'Lesson' },
    timestamp: { type: Number }, // Video vaqt belgisi
    note: { type: String },
    createdAt: { type: Date, default: Date.now }
  }],
  
  // Sozlamalar
  settings: {
    autoPlay: { type: Boolean, default: true },
    playbackSpeed: { type: Number, default: 1.0 },
    subtitles: { type: Boolean, default: false },
    quality: { type: String, default: 'auto' }
  },

  updatedAt: { type: Date, default: Date.now }
});

// Indexlar
ProgressSchema.index({ student: 1, course: 1 }, { unique: true });
ProgressSchema.index({ student: 1, status: 1 });
ProgressSchema.index({ course: 1, progress: 1 });
ProgressSchema.index({ updatedAt: 1 });
ProgressSchema.index({ 'completedLessons.lesson': 1 });
module.exports = mongoose.model('Progress', ProgressSchema);
