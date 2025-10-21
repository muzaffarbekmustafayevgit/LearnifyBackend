// controllers/enrollmentController.js
const Enrollment = require('../models/Enrollment');
const Course = require('../models/Course');
const mongoose = require('mongoose');

// ✅ Kursga bepul yozilish
exports.enrollInCourse = async (req, res) => {
  try {
    const { courseId } = req.params;
    const studentId = req.user.id;

    console.log('=== ENROLLMENT DEBUG ===');
    console.log('1. Course ID:', courseId);
    console.log('2. Student ID:', studentId);

    // ID larni tekshirish
    if (!mongoose.Types.ObjectId.isValid(courseId)) {
      return res.status(400).json({
        success: false,
        message: 'Noto‘g‘ri kurs ID si'
      });
    }

    // Kursni tekshirish
    const course = await Course.findOne({
      _id: courseId,
      isDeleted: false,
      status: 'published'
    });

    if (!course) {
      return res.status(404).json({
        success: false,
        message: 'Kurs topilmadi yoki nashr qilinmagan'
      });
    }

    console.log('3. Course found:', course.title);

    // O'qituvchi o'z kursiga yozilolmasligi
    if (course.teacher.toString() === studentId) {
      return res.status(400).json({
        success: false,
        message: 'Siz o‘z kursingizga yozilolmaysiz'
      });
    }

    // Oldin yozilganligini tekshirish
    const existingEnrollment = await Enrollment.findOne({
      student: studentId,
      course: courseId
    });

    if (existingEnrollment) {
      return res.status(400).json({
        success: false,
        message: 'Siz ushbu kursga allaqachon yozilgansiz'
      });
    }

    console.log('4. No existing enrollment found');

    // Kursdagi jami darslar sonini hisoblash
    const totalLessons = await mongoose.model('Lesson').countDocuments({
      course: courseId,
      isDeleted: false,
      status: 'published'
    });

    console.log('5. Total lessons in course:', totalLessons);

    // Yangi enrollment yaratish
    const enrollment = await Enrollment.create({
      student: studentId,
      course: courseId,
      status: 'active',
      progress: {
        totalLessons: totalLessons,
        completedLessons: [],
        completedLessonsCount: 0,
        completionPercentage: 0,
        lastAccessed: new Date()
      },
      enrolledAt: new Date()
    });

    // Kursdagi studentlar sonini yangilash
    await Course.findByIdAndUpdate(courseId, {
      $addToSet: { students: studentId },
      $inc: { enrollmentCount: 1 }
    });

    // Ma'lumotlarni populate qilish
    await enrollment.populate('student', 'name email avatar');
    await enrollment.populate('course', 'title thumbnail price level teacher');
    await enrollment.populate('course.teacher', 'name avatar');

    console.log('6. Enrollment created successfully');

    res.status(201).json({
      success: true,
      message: 'Kursga muvaffaqiyatli yozildingiz!',
      data: { enrollment }
    });

  } catch (err) {
    console.error('❌ Enrollment error:', err);
    
    // Duplicate key error (allaqachon yozilgan)
    if (err.code === 11000) {
      return res.status(400).json({
        success: false,
        message: 'Siz ushbu kursga allaqachon yozilgansiz'
      });
    }

    res.status(500).json({
      success: false,
      message: 'Kursga yozilishda xatolik: ' + err.message
    });
  }
};

// ✅ Kursdan chiqish
exports.unenrollFromCourse = async (req, res) => {
  try {
    const { courseId } = req.params;
    const studentId = req.user.id;

    const enrollment = await Enrollment.findOne({
      student: studentId,
      course: courseId
    });

    if (!enrollment) {
      return res.status(404).json({
        success: false,
        message: 'Siz ushbu kursga yozilmagansiz'
      });
    }

    // Enrollmentni o'chirish
    await Enrollment.findByIdAndDelete(enrollment._id);

    // Kursdagi studentlar ro'yxatidan o'chirish
    await Course.findByIdAndUpdate(courseId, {
      $pull: { students: studentId },
      $inc: { enrollmentCount: -1 }
    });

    res.json({
      success: true,
      message: 'Kursdan muvaffaqiyatli chiqdingiz'
    });

  } catch (err) {
    console.error('Unenrollment error:', err);
    res.status(500).json({
      success: false,
      message: 'Kursdan chiqishda xatolik: ' + err.message
    });
  }
};

// ✅ Mening kurslarim (o'quvchi uchun)
exports.getMyEnrollments = async (req, res) => {
  try {
    const studentId = req.user.id;
    const { 
      page = 1, 
      limit = 10, 
      status 
    } = req.query;

    const query = { student: studentId };
    if (status && status !== 'all') {
      query.status = status;
    }

    const enrollments = await Enrollment.find(query)
      .populate({
        path: 'course',
        select: 'title thumbnail description level category price teacher rating enrollmentCount duration',
        populate: {
          path: 'teacher',
          select: 'name avatar rating'
        }
      })
      .sort({ enrolledAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit);

    const total = await Enrollment.countDocuments(query);

    res.json({
      success: true,
      data: {
        enrollments,
        pagination: {
          currentPage: parseInt(page),
          totalPages: Math.ceil(total / limit),
          totalEnrollments: total,
          hasNextPage: page < Math.ceil(total / limit),
          hasPrevPage: page > 1
        }
      }
    });

  } catch (err) {
    console.error('Get enrollments error:', err);
    res.status(500).json({
      success: false,
      message: 'Kurslarni olishda xatolik: ' + err.message
    });
  }
};

// ✅ Darsni tugallangan deb belgilash
exports.completeLesson = async (req, res) => {
  try {
    const { courseId, lessonId } = req.params;
    const studentId = req.user.id;

    console.log('=== COMPLETE LESSON DEBUG ===');
    console.log('1. Course ID:', courseId);
    console.log('2. Lesson ID:', lessonId);
    console.log('3. Student ID:', studentId);

    // Enrollmentni topish
    const enrollment = await Enrollment.findOne({
      student: studentId,
      course: courseId,
      status: 'active'
    });

    if (!enrollment) {
      return res.status(404).json({
        success: false,
        message: 'Siz ushbu kursga yozilmagansiz yoki aktiv emas'
      });
    }

    console.log('4. Enrollment found');

    // Darsni tekshirish
    const lesson = await mongoose.model('Lesson').findOne({
      _id: lessonId,
      course: courseId,
      isDeleted: false,
      status: 'published'
    });

    if (!lesson) {
      return res.status(404).json({
        success: false,
        message: 'Dars topilmadi'
      });
    }

    console.log('5. Lesson found:', lesson.title);

    // Darsni tugallangan deb belgilash
    enrollment.updateProgress(lessonId);
    await enrollment.save();

    console.log('6. Lesson completed, progress updated');

    res.json({
      success: true,
      message: 'Dars tugallandi!',
      data: {
        enrollment: {
          progress: enrollment.progress,
          status: enrollment.status
        }
      }
    });

  } catch (err) {
    console.error('Complete lesson error:', err);
    res.status(500).json({
      success: false,
      message: 'Darsni tugallashda xatolik: ' + err.message
    });
  }
};

// ✅ Enrollment ma'lumotlarini olish
exports.getEnrollment = async (req, res) => {
  try {
    const { courseId } = req.params;
    const studentId = req.user.id;

    const enrollment = await Enrollment.findOne({
      student: studentId,
      course: courseId
    })
      .populate({
        path: 'course',
        select: 'title thumbnail description level category price teacher modules',
        populate: [
          {
            path: 'teacher',
            select: 'name avatar rating bio'
          },
          {
            path: 'modules',
            match: { isDeleted: false },
            options: { sort: { order: 1 } },
            populate: {
              path: 'lessons',
              match: { isDeleted: false, status: 'published' },
              options: { sort: { order: 1 } },
              select: 'title duration type order _id'
            }
          }
        ]
      });

    if (!enrollment) {
      return res.status(404).json({
        success: false,
        message: 'Siz ushbu kursga yozilmagansiz'
      });
    }

    res.json({
      success: true,
      data: { enrollment }
    });

  } catch (err) {
    console.error('Get enrollment error:', err);
    res.status(500).json({
      success: false,
      message: 'Enrollment ma\'lumotlarini olishda xatolik: ' + err.message
    });
  }
};

// ✅ Kurs studentlarini olish (o'qituvchi uchun)
exports.getCourseStudents = async (req, res) => {
  try {
    const { courseId } = req.params;
    const teacherId = req.user.id;

    // Kursni tekshirish (faqat o'qituvchi ko'ra oladi)
    const course = await Course.findOne({
      _id: courseId,
      teacher: teacherId,
      isDeleted: false
    });

    if (!course) {
      return res.status(404).json({
        success: false,
        message: 'Kurs topilmadi yoki sizda huquq yo\'q'
      });
    }

    const { page = 1, limit = 20 } = req.query;

    const enrollments = await Enrollment.find({ course: courseId })
      .populate('student', 'name email avatar createdAt')
      .sort({ enrolledAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit);

    const total = await Enrollment.countDocuments({ course: courseId });

    res.json({
      success: true,
      data: {
        students: enrollments,
        pagination: {
          currentPage: parseInt(page),
          totalPages: Math.ceil(total / limit),
          totalStudents: total
        }
      }
    });

  } catch (err) {
    console.error('Get course students error:', err);
    res.status(500).json({
      success: false,
      message: 'Studentlarni olishda xatolik: ' + err.message
    });
  }
};

// ✅ Enrollment statistikasi
exports.getEnrollmentStats = async (req, res) => {
  try {
    const studentId = req.user.id;

    const stats = await Enrollment.aggregate([
      { $match: { student: new mongoose.Types.ObjectId(studentId) } },
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 }
        }
      }
    ]);

    const totalEnrollments = await Enrollment.countDocuments({ student: studentId });
    const completedCourses = await Enrollment.countDocuments({ 
      student: studentId, 
      status: 'completed' 
    });

    const result = {
      total: totalEnrollments,
      completed: completedCourses,
      inProgress: totalEnrollments - completedCourses,
      byStatus: stats.reduce((acc, curr) => {
        acc[curr._id] = curr.count;
        return acc;
      }, {})
    };

    res.json({
      success: true,
      data: { stats: result }
    });

  } catch (err) {
    console.error('Get enrollment stats error:', err);
    res.status(500).json({
      success: false,
      message: 'Statistikani olishda xatolik: ' + err.message
    });
  }
};