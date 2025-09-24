const mongoose = require('mongoose');

const OptionSchema = new mongoose.Schema({
  text: { type: String, required: true },
  explanation: { type: String } // Noto'g'ri javob uchun tushuntirish
}, { _id: false });

const QuestionSchema = new mongoose.Schema({
  question: { type: String, required: true },
  type: { 
    type: String, 
    enum: ['single-choice', 'multiple-choice', 'true-false', 'fill-blank'], 
    default: 'single-choice' 
  },
  options: [OptionSchema],
  correctIndex: { type: Number }, // single-choice uchun
  correctIndexes: [{ type: Number }], // multiple-choice uchun
  correctAnswer: { type: String }, // fill-blank uchun
  explanation: { type: String }, // Savol tushuntirishi
  points: { type: Number, default: 1 },
  difficulty: { 
    type: String, 
    enum: ['easy', 'medium', 'hard'], 
    default: 'medium' 
  },
  tags: [String]
});

const LessonSchema = new mongoose.Schema({
  // Asosiy ma'lumotlar
  title: { type: String, required: true, trim: true },
  subtitle: { type: String }, // Qisqa sarlavha
  description: { type: String },
  type: { 
    type: String, 
    enum: ['video', 'material', 'text', 'test', 'quiz', 'assignment', 'live'], 
    required: true 
  },
  
  // Modul va kurs bog'lanishlari
  course: { type: mongoose.Schema.Types.ObjectId, ref: 'Course', required: true },
  module: { type: mongoose.Schema.Types.ObjectId, ref: 'Module' },
  teacher: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  
  // Kontent maydonlari
  contentUrl: { type: String }, // Video, fayl yoki link
  textContent: { type: String }, // Matnli kontent
  thumbnail: { type: String }, // Dars uchun rasim
  attachments: [{
    name: String,
    url: String,
    type: String,
    size: Number,
    uploadedAt: { type: Date, default: Date.now }
  }],
  
  // Test va savollar
  questions: [QuestionSchema],
  quizSettings: {
    timeLimit: { type: Number, default: 0 }, // 0 = cheksiz vaqt
    passingScore: { type: Number, default: 60 }, // Minimal foiz
    maxAttempts: { type: Number, default: 1 },
    showAnswers: { type: Boolean, default: false },
    randomizeQuestions: { type: Boolean, default: false }
  },
  
  // Davomiylik va og'irlik
  duration: { type: Number, default: 0 }, // minutlarda
  weight: { type: Number, default: 1 }, // Progress hisobida og'irlik
  points: { type: Number, default: 0 }, // Dars uchun ballar
  
  // Tartib va tashkil etish
  order: { type: Number, default: 0 },
  lessonNumber: { type: String }, // "1.1", "2.3" kabi
  
  // Tekin preview
  isFree: { type: Boolean, default: false },
  previewDuration: { type: Number, default: 0 }, // Tekin ko'rish davomiyligi
  
  // Holat va boshqarish
  status: { 
    type: String, 
    enum: ['draft', 'published', 'scheduled', 'archived'], 
    default: 'draft' 
  },
  isDeleted: { type: Boolean, default: false },
  isCompleted: { type: Boolean, default: false },
  
  // Meta ma'lumotlar
  objectives: [String], // Dars maqsadlari
  prerequisites: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Lesson' }],
  tags: [String],
  seoDescription: { type: String },
  
  // Vaqt belgilari
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
  publishedAt: Date,
  scheduledFor: Date, // Rejalashtirilgan vaqt
  
  // Live session uchun
  liveSession: {
    isLive: { type: Boolean, default: false },
    startTime: Date,
    endTime: Date,
    meetingUrl: String,
    recordingUrl: String,
    participants: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }]
  },
  
  // Statistika
  viewCount: { type: Number, default: 0 },
  completionCount: { type: Number, default: 0 },
  averageScore: { type: Number, default: 0 }
});

// Avtomatik yangilash
LessonSchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  if (this.status === 'published' && !this.publishedAt) {
    this.publishedAt = new Date();
  }
  next();
});

module.exports = mongoose.model('Lesson', LessonSchema);
