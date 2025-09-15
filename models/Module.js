const mongoose = require('mongoose');

const ModuleSchema = new mongoose.Schema({
    title: { type: String, required: true, trim: true },
    description: { type: String, default: '' },
    course: { type: mongoose.Schema.Types.ObjectId, ref: 'Course', required: true },
    lessons: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Lesson' }],
    order: { type: Number, default: 0 },
    isDeleted: { type: Boolean, default: false }, // soft-delete
    createdAt: { type: Date, default: Date.now }
  });

module.exports = mongoose.model('Module', ModuleSchema);
