// models/Enrollment.js
const mongoose = require('mongoose');

const enrollmentSchema = new mongoose.Schema({
  student: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  course: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Course',
    required: true
  },
  status: {
    type: String,
    enum: ['active', 'completed', 'cancelled'],
    default: 'active'
  },
  progress: {
    completedLessons: [{
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Lesson'
    }],
    completionPercentage: {
      type: Number,
      default: 0,
      min: 0,
      max: 100
    },
    lastAccessed: {
      type: Date,
      default: Date.now
    },
    totalLessons: {
      type: Number,
      default: 0
    },
    completedLessonsCount: {
      type: Number,
      default: 0
    }
  },
  enrolledAt: {
    type: Date,
    default: Date.now
  },
  completedAt: {
    type: Date
  }
}, {
  timestamps: true
});

// Compound index - bir student bir kursga faqat bir marta yozilishi mumkin
enrollmentSchema.index({ student: 1, course: 1 }, { unique: true });

// Progressni yangilash metodlari
enrollmentSchema.methods.updateProgress = function(lessonId) {
  if (!this.progress.completedLessons.includes(lessonId)) {
    this.progress.completedLessons.push(lessonId);
    this.progress.completedLessonsCount = this.progress.completedLessons.length;
    
    if (this.progress.totalLessons > 0) {
      this.progress.completionPercentage = Math.round(
        (this.progress.completedLessonsCount / this.progress.totalLessons) * 100
      );
    }
    
    this.progress.lastAccessed = new Date();
    
    // Agar barcha darslar tugallangan bo'lsa
    if (this.progress.completionPercentage >= 95) { // 95% dan ko'p bo'lsa completed deb hisoblaymiz
      this.status = 'completed';
      this.completedAt = new Date();
    }
  }
};

// Progressni qayta hisoblash
enrollmentSchema.methods.recalculateProgress = async function() {
  const totalLessons = await mongoose.model('Lesson').countDocuments({
    course: this.course,
    isDeleted: false,
    status: 'published'
  });
  
  this.progress.totalLessons = totalLessons;
  this.progress.completedLessonsCount = this.progress.completedLessons.length;
  
  if (totalLessons > 0) {
    this.progress.completionPercentage = Math.round(
      (this.progress.completedLessonsCount / totalLessons) * 100
    );
  }
  
  await this.save();
};

// Virtual maydonlar
enrollmentSchema.virtual('isCompleted').get(function() {
  return this.status === 'completed';
});

enrollmentSchema.virtual('isActive').get(function() {
  return this.status === 'active';
});

// JSON ga virtual maydonlarni qo'shish
enrollmentSchema.set('toJSON', { virtuals: true });

module.exports = mongoose.model('Enrollment', enrollmentSchema);