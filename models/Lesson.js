const mongoose = require('mongoose');

const OptionSchema = new mongoose.Schema({
  text: String
}, { _id: false });

const QuestionSchema = new mongoose.Schema({
  question: { type: String, required: true },
  options: [OptionSchema],
  correctIndex: { type: Number } // index of correct option
});

const LessonSchema = new mongoose.Schema({
  title: { type: String, required: true },
  type: { type: String, enum: ['video', 'material', 'text', 'test'], required: true },
  contentUrl: { type: String }, // video/material file link
  textContent: { type: String }, // text-based lessons
  course: { type: mongoose.Schema.Types.ObjectId, ref: 'Course', required: true },
  teacher: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  questions: [QuestionSchema], // only if type === 'test'
  weight: { type: Number, default: 1 }, // progress weighting
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Lesson', LessonSchema);
