const express = require('express');
const { 
  createLesson, 
  getLessonsByCourse, 
  getLessonById, 
  updateLesson, 
  deleteLesson, 
  completeLesson, 
  retryQuiz 
} = require('../controllers/lessonController');
const { authMiddleware } = require('../middlewares/authMiddleware'); // ✅ To'g'ri import

const router = express.Router();

// 🔹 Lesson CRUD
router.post('/', authMiddleware(['admin', 'teacher']), createLesson);
router.get('/course/:courseId', authMiddleware(), getLessonsByCourse);
router.get('/:id', authMiddleware(), getLessonById);
router.put('/:id', authMiddleware(['admin', 'teacher']), updateLesson);
router.delete('/:id', authMiddleware(['admin']), deleteLesson);

// 🔹 Student actions
router.post('/:id/complete', authMiddleware(['student']), completeLesson);
router.post('/:id/retry', authMiddleware(['student']), retryQuiz);

module.exports = router;