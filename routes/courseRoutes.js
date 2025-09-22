const express = require('express');
const { 
  createCourse,
  getAllCourses,
  getMyCourses,
  getCourse,
  updateCourse,
  deleteCourse,
  completeCourse
} = require('../controllers/courseController');
const { authMiddleware } = require('../middlewares/authMiddleware'); // ✅ To'g'ri import

const router = express.Router();

// ✅ To'g'ri ishlatish
router.post('/', authMiddleware(['admin', 'teacher']), createCourse);
router.get('/', getAllCourses);
router.get('/my', authMiddleware(), getMyCourses);
router.get('/:id', getCourse);
router.put('/:id', authMiddleware(['admin', 'teacher']), updateCourse);
router.delete('/:id', authMiddleware(['admin']), deleteCourse);
router.post('/:id/complete', authMiddleware(['student']), completeCourse);

module.exports = router;