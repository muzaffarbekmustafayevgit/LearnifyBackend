// routes/enrollmentRoutes.js
const express = require('express');
const router = express.Router();
const enrollmentController = require('../controllers/enrollmentController');
const { verifyToken, requireRole } = require('../middlewares/authMiddleware');

// 🔐 Barcha route'lar token talab qiladi
router.use(verifyToken);

// 👤 Student route'lari
router.post('/courses/:courseId/enroll', enrollmentController.enrollInCourse);
router.delete('/courses/:courseId/unenroll', enrollmentController.unenrollFromCourse);
router.get('/my-enrollments', enrollmentController.getMyEnrollments);
router.get('/enrollments/stats', enrollmentController.getEnrollmentStats);
router.get('/courses/:courseId/enrollment', enrollmentController.getEnrollment);
router.patch('/courses/:courseId/lessons/:lessonId/complete', enrollmentController.completeLesson);

// 👨‍🏫 O'qituvchi route'lari
router.get('/teacher/courses/:courseId/students', 
  requireRole(['teacher', 'admin']), 
  enrollmentController.getCourseStudents
);

module.exports = router;