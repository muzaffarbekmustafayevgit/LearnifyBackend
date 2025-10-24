const mongoose = require('mongoose');

const enrollmentSchema = new mongoose.Schema({
  student: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'Student ID kiritilishi shart']
  },
  course: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Course',
    required: [true, 'Course ID kiritilishi shart']
  },
  status: {
    type: String,
    enum: {
      values: ['active', 'completed', 'cancelled'],
      message: 'Status faqat: active, completed, cancelled bo\'lishi mumkin'
    },
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
      min: [0, 'Progress 0% dan kam bo\'lmasligi kerak'],
      max: [100, 'Progress 100% dan oshmasligi kerak']
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
    },
    lastLessonCompleted: {
      type: Date
    }
  },
  enrolledAt: {
    type: Date,
    default: Date.now
  },
  completedAt: {
    type: Date
  },
  cancelledAt: {
    type: Date
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Compound index - bir student bir kursga faqat bir marta yozilishi mumkin
enrollmentSchema.index({ student: 1, course: 1 }, { unique: true });

// Progressni yangilash metodlari
enrollmentSchema.methods.updateProgress = function(lessonId) {
  if (!this.progress.completedLessons.includes(lessonId)) {
    this.progress.completedLessons.push(lessonId);
    this.progress.completedLessonsCount = this.progress.completedLessons.length;
    this.progress.lastLessonCompleted = new Date();
    
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
  return this;
};

// Progressni qayta hisoblash
enrollmentSchema.methods.recalculateProgress = async function() {
  const Lesson = mongoose.model('Lesson');
  const totalLessons = await Lesson.countDocuments({
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
  
  // Statusni yangilash
  if (this.progress.completionPercentage >= 95 && this.status !== 'completed') {
    this.status = 'completed';
    this.completedAt = new Date();
  }
  
  return this.save();
};

// Enrollment davomiyligi
enrollmentSchema.virtual('duration').get(function() {
  if (this.completedAt) {
    return this.completedAt - this.enrolledAt;
  }
  return Date.now() - this.enrolledAt;
});

// Virtual maydonlar
enrollmentSchema.virtual('isCompleted').get(function() {
  return this.status === 'completed';
});

enrollmentSchema.virtual('isActive').get(function() {
  return this.status === 'active';
});

enrollmentSchema.virtual('isCancelled').get(function() {
  return this.status === 'cancelled';
});

// Middleware - yangilangan vaqtni kuzatish
enrollmentSchema.pre('save', function(next) {
  if (this.isModified('status')) {
    if (this.status === 'cancelled' && !this.cancelledAt) {
      this.cancelledAt = new Date();
    }
    if (this.status === 'completed' && !this.completedAt) {
      this.completedAt = new Date();
    }
  }
  next();
});

// Statik metodlar
enrollmentSchema.statics.getStudentEnrollments = function(studentId, options = {}) {
  const { status, limit = 10, page = 1 } = options;
  const query = { student: studentId };
  
  if (status) {
    query.status = status;
  }
  
  return this.find(query)
    .populate('course', 'title thumbnail description level category')
    .populate('student', 'name email')
    .limit(limit)
    .skip((page - 1) * limit)
    .sort({ enrolledAt: -1 });
};

enrollmentSchema.statics.getCourseEnrollments = function(courseId, options = {}) {
  const { status, limit = 20, page = 1 } = options;
  const query = { course: courseId };
  
  if (status) {
    query.status = status;
  }
  
  return this.find(query)
    .populate('student', 'name email avatar')
    .limit(limit)
    .skip((page - 1) * limit)
    .sort({ enrolledAt: -1 });
};

module.exports = mongoose.model('Enrollment', enrollmentSchema);