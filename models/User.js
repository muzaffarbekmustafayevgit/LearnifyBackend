const mongoose = require('mongoose');
const UserSchema = new mongoose.Schema({
  // Shaxsiy ma'lumotlar
  name: { type: String, required: true, trim: true, maxlength: 100 },
  email: { type: String, required: true, unique: true, lowercase: true, trim: true },
  password: { type: String, required: true },
  phone: { type: String, trim: true },
  avatar: { type: String }, // Profil rasmi
  bio: { type: String, maxlength: 500 }, // Qisqa tarjimai hol
  dateOfBirth: { type: Date },
  gender: { type: String, enum: ['male', 'female', 'other'] },
  
  // Rol va huquqlar
  role: { type: String, enum: ['student', 'teacher', 'admin', 'moderator'], default: 'student' },
  permissions: [{ type: String }], // Aniq huquqlar
  isVerified: { type: Boolean, default: false }, // Umumiy tasdiqlash

  // Email aktivatsiya
  isActive: { type: Boolean, default: false },
  activationCode: { type: String },
  activationExpires: { type: Date },
  emailVerified: { type: Boolean, default: false },
  emailVerificationToken: { type: String },

  // Teacher uchun qo'shimcha
  profile: {
    headline: { type: String, maxlength: 200 }, // "Senior Web Developer"
    description: { type: String, maxlength: 1000 }, // Batafsil tavsif
    website: { type: String },
    socialMedia: {
      linkedin: { type: String },
      twitter: { type: String },
      github: { type: String },
      youtube: { type: String }
    },
    hourlyRate: { type: Number }, // Soatlik narx
    availableForHire: { type: Boolean, default: false }
  },
  
  // O'qituvchi ma'lumotlari
  subject: { type: String, trim: true },
  subjects: [{ type: String }], // Bir nechta fanlar
  faculty: { type: String, trim: true },
  experienceYears: { type: Number, default: 0 },
  qualifications: [{
    degree: String,
    institution: String,
    year: Number,
    certificateUrl: String
  }],
  teacherRating: {
    average: { type: Number, default: 0 },
    count: { type: Number, default: 0 }
  },

  // Talaba ma'lumotlari
  studentProfile: {
    level: { type: String, enum: ['beginner', 'intermediate', 'advanced'] },
    interests: [{ type: String }],
    goals: [{ type: String }],
    education: {
      institution: String,
      fieldOfStudy: String,
      degree: String,
      graduationYear: Number
    }
  },

  // Gamification
  points: { type: Number, default: 0 },
  rank: { type: String, default: 'Beginner' },
  badges: [{
    name: String,
    icon: String,
    earnedAt: { type: Date, default: Date.now },
    description: String
  }],
  achievements: [{
    title: String,
    description: String,
    earnedAt: Date,
    type: String
  }],
  streak: { type: Number, default: 0 }, // Ketma-ket kunlar
  lastActive: { type: Date },

  // Xavfsizlik
  refreshToken: { type: String },
  resetPasswordToken: { type: String },
  resetPasswordExpires: { type: Date },
  loginAttempts: { type: Number, default: 0 },
  lockUntil: { type: Date },
  twoFactorEnabled: { type: Boolean, default: false },
  twoFactorSecret: { type: String },

  // Progress va faollik
  enrolledCourses: [{
    course: { type: mongoose.Schema.Types.ObjectId, ref: 'Course' },
    enrolledAt: { type: Date, default: Date.now },
    progress: { type: Number, default: 0 },
    completed: { type: Boolean, default: false },
    completedAt: Date,
    lastAccessed: Date,
    certificateUrl: String
  }],
  
  createdCourses: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Course' }],
  completedLessons: [{ 
    lesson: { type: mongoose.Schema.Types.ObjectId, ref: 'Lesson' },
    completedAt: { type: Date, default: Date.now },
    score: Number,
    timeSpent: Number // minutlarda
  }],

  // Notification preferences
  notifications: {
    email: { type: Boolean, default: true },
    courseUpdates: { type: Boolean, default: true },
    newMessages: { type: Boolean, default: true },
    promotions: { type: Boolean, default: false }
  },

  // Sozlamalar
  preferences: {
    language: { type: String, default: 'en' },
    timezone: { type: String, default: 'UTC' },
    theme: { type: String, enum: ['light', 'dark', 'auto'], default: 'auto' }
  },

  // Statistika
  totalTimeSpent: { type: Number, default: 0 }, // minutlarda
  coursesCompleted: { type: Number, default: 0 },
  certificatesEarned: { type: Number, default: 0 },

  // Holat
  isOnline: { type: Boolean, default: false },
  lastLogin: { type: Date },
  profileCompleted: { type: Boolean, default: false },

  // Sana va vaqt
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

// Avtomatik yangilash
UserSchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  next();
});
module.exports = mongoose.model('User', UserSchema);
