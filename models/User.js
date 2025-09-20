const mongoose = require('mongoose');

const UserSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true, maxlength: 100 },
  email: { type: String, required: true, unique: true, lowercase: true, trim: true },
  password: { type: String, required: true },
  role: { type: String, enum: ['student', 'teacher', 'admin'], default: 'student' },

  // Email aktivatsiya
  isActive: { type: Boolean, default: false },
  activationCode: { type: String },
  activationExpires: { type: Date },

  // Teacher uchun qo‘shimcha
  subject: { type: String, trim: true },
  faculty: { type: String, trim: true },
  experienceYears: { type: Number, default: 0 },

  // Gamification
  points: { type: Number, default: 0 },
  rank: { type: String, default: 'Beginner' },
  badges: [{ type: String, default: [] }],

  // 🔑 Refresh token saqlash
  refreshToken: { type: String },

  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('User', UserSchema);
