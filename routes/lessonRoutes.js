// routes/lessonRoutes.js
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
const { 
  verifyToken, 
  requireRole 
} = require('../middlewares/authMiddleware'); // middleware (birlik) papkasi

const router = express.Router();

// 🔐 Barcha route'lar token talab qiladi
router.use(verifyToken);

// 📚 Lesson CRUD operatsiyalari

// ➕ Yangi dars yaratish (faqat teacher/admin)
router.post('/', requireRole(['teacher', 'admin']), createLesson);

// 🔍 Kurs bo'yicha darslarni olish (hammaga ochiq)
router.get('/course/:courseId', getLessonsByCourse);

// 🔍 Darsni ID bo'yicha olish (hammaga ochiq)
router.get('/:id', getLessonById);

// ✏️ Darsni yangilash (faqat teacher/admin)
router.put('/:id', requireRole(['teacher', 'admin']), updateLesson);

// 🗑️ Darsni o'chirish (faqat admin)
router.delete('/:id', requireRole(['admin']), deleteLesson);

// ✅ Darsni tugallash (faqat student)
router.post('/:id/complete', requireRole(['student']), completeLesson);

// 🔄 Quizni qayta urinish (faqat student)
router.post('/:id/retry', requireRole(['student']), retryQuiz);

module.exports = router;