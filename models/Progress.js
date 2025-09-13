const mongoose = require('mongoose');

const ProgressSchema = new mongoose.Schema({
  student: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  course: { type: mongoose.Schema.Types.ObjectId, ref: 'Course', required: true },
  completedLessons: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Lesson' }],
  progress: { type: Number, default: 0 }, // 0-100 %
  updatedAt: { type: Date, default: Date.now }
});

ProgressSchema.index({ student: 1, course: 1 }, { unique: true });

module.exports = mongoose.model('Progress', ProgressSchema);
