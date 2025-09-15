const mongoose = require('mongoose');

const OptionSchema = new mongoose.Schema({
  text: String
}, { _id: false });

const QuestionSchema = new mongoose.Schema({
  question: { type: String, required: true },
  options: [OptionSchema],
  correctIndex: { type: Number }
});

const LessonSchema = new mongoose.Schema({
  title: { type: String, required: true },
  type: { type: String, enum: ['video', 'material', 'text', 'test'], required: true },
  contentUrl: { type: String },
  textContent: { type: String },
  course: { type: mongoose.Schema.Types.ObjectId, ref: 'Course', required: true },
  teacher: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  questions: [QuestionSchema],
  weight: { type: Number, default: 1 },
  isDeleted: { type: Boolean, default: false },
  
  // ✅ Teacher lessonni tugatganligini belgilash
  isCompleted: { type: Boolean, default: false },

  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Lesson', LessonSchema);
