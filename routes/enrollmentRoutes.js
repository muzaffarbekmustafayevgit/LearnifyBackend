const express = require('express');
const router = express.Router();
const enrollmentController = require('../controllers/enrollmentController');
const { verifyToken, requireRole } = require('../middlewares/authMiddleware');

// 🔐 Barcha route'lar token talab qiladi
router.use(verifyToken);

// 👤 STUDENT ROUTE'lari
// =====================

/**
 * @route   POST /api/enrollments/courses/:courseId/enroll
 * @desc    Kursga yozilish
 * @access  Private (Student)
 */
router.post('/courses/:courseId/enroll', enrollmentController.enrollInCourse);

/**
 * @route   DELETE /api/enrollments/courses/:courseId/unenroll
 * @desc    Kursdan chiqish
 * @access  Private (Student)
 */
router.delete('/courses/:courseId/unenroll', enrollmentController.unenrollFromCourse);

/**
 * @route   GET /api/enrollments/my-enrollments
 * @desc    O'quvchining yozilgan kurslari
 * @access  Private (Student)
 */
router.get('/my-enrollments', enrollmentController.getMyEnrollments);

/**
 * @route   GET /api/enrollments/enrollments/stats
 * @desc    O'quvchi statistikasi
 * @access  Private (Student)
 */
router.get('/enrollments/stats', enrollmentController.getEnrollmentStats);

/**
 * @route   GET /api/enrollments/courses/:courseId/enrollment
 * @desc    Kurs enrollment ma'lumotlari
 * @access  Private (Student)
 */
router.get('/courses/:courseId/enrollment', enrollmentController.getEnrollment);

/**
 * @route   PATCH /api/enrollments/courses/:courseId/lessons/:lessonId/complete
 * @desc    Darsni tugallangan deb belgilash
 * @access  Private (Student)
 */
router.patch('/courses/:courseId/lessons/:lessonId/complete', enrollmentController.completeLesson);

/**
 * @route   PUT /api/enrollments/courses/:courseId/status
 * @desc    Enrollment statusini yangilash
 * @access  Private (Student)
 */
router.put('/courses/:courseId/status', enrollmentController.updateEnrollmentStatus);

// 👨‍🏫 O'QITUVCHI ROUTE'lari
// ========================

/**
 * @route   GET /api/enrollments/teacher/courses/:courseId/students
 * @desc    Kurs studentlarini olish
 * @access  Private (Teacher, Admin)
 */
router.get('/teacher/courses/:courseId/students', 
  requireRole(['teacher', 'admin']), 
  enrollmentController.getCourseStudents
);

/**
 * @route   GET /api/enrollments/teacher/my-courses/students
 * @desc    O'qituvchining barcha kurslaridagi studentlar
 * @access  Private (Teacher, Admin)
 */
router.get('/teacher/my-courses/students',
  requireRole(['teacher', 'admin']),
  async (req, res) => {
    try {
      const teacherId = req.user.id;
      const Course = require('../models/Course');
      
      const courses = await Course.find({ 
        teacher: teacherId,
        isDeleted: false 
      }).select('_id title');
      
      const enrollments = await require('../models/Enrollment').find({
        course: { $in: courses.map(c => c._id) }
      })
      .populate('student', 'name email avatar')
      .populate('course', 'title')
      .sort({ enrolledAt: -1 });
      
      res.json({
        success: true,
        data: {
          courses: courses,
          students: enrollments,
          totalStudents: enrollments.length
        }
      });
    } catch (err) {
      res.status(500).json({
        success: false,
        message: 'Xatolik: ' + err.message
      });
    }
  }
);

// 🛠 ADMIN ROUTE'lari
// ===================

/**
 * @route   GET /api/enrollments/admin/overview
 * @desc    Barcha enrollmentlar statistikasi (Admin)
 * @access  Private (Admin)
 */
router.get('/admin/overview',
  requireRole(['admin']),
  async (req, res) => {
    try {
      const Enrollment = require('../models/Enrollment');
      const Course = require('../models/Course');
      const User = require('../models/User');
      
      const totalEnrollments = await Enrollment.countDocuments();
      const totalCourses = await Course.countDocuments({ isDeleted: false });
      const totalStudents = await User.countDocuments({ role: 'student' });
      
      const recentEnrollments = await Enrollment.find()
        .populate('student', 'name email')
        .populate('course', 'title')
        .sort({ enrolledAt: -1 })
        .limit(10);
      
      const stats = await Enrollment.aggregate([
        {
          $group: {
            _id: '$status',
            count: { $sum: 1 }
          }
        }
      ]);
      
      res.json({
        success: true,
        data: {
          overview: {
            totalEnrollments,
            totalCourses,
            totalStudents,
            enrollmentRate: totalStudents > 0 ? (totalEnrollments / totalStudents).toFixed(2) : 0
          },
          statusStats: stats,
          recentEnrollments
        }
      });
    } catch (err) {
      res.status(500).json({
        success: false,
        message: 'Xatolik: ' + err.message
      });
    }
  }
);

module.exports = router;