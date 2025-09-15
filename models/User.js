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
  rank: { type: String, default: 'Beginner' }, // Beginner, Intermediate, Pro...
  badges: [{ type: String, default: [] }],
 // masalan: "Quiz Master", "Fast Learner"

  createdAt: { type: Date, default: Date.now }
});
