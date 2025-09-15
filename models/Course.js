const mongoose = require('mongoose');

const CourseSchema = new mongoose.Schema({
  title: { type: String, required: true, trim: true },
  description: { type: String, default: '' },
  teacher: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  lessons: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Lesson' }],
  isDeleted: { type: Boolean, default: false },
  
  // ✅ Teacher kursni to‘liq yozib bo‘lganda belgilaydi
  isCompleted: { type: Boolean, default: false },

  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Course', CourseSchema);
