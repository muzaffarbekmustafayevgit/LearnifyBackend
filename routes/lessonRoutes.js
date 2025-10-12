const express = require('express');
const { 
  createLesson, 
  getLessonsByCourse, 
  getLessonById, 
  updateLesson, 
  deleteLesson, 
  completeLesson, 
  submitTest,
  retryQuiz 
} = require('../controllers/lessonController');
const { verifyToken, requireRole } = require('../middlewares/authMiddleware');

const router = express.Router();

// 🔐 Barcha route'lar token talab qiladi
router.use(verifyToken);

// 📚 Lesson CRUD operatsiyalari

// ➕ Yangi dars yaratish (faqat teacher/admin)
router.post('/', requireRole(['teacher', 'admin']), createLesson);

// 🔍 Kurs bo'yicha darslarni olish
router.get('/course/:courseId', getLessonsByCourse);

// 🔍 Darsni ID bo'yicha olish
router.get('/:id', getLessonById);

// ✏️ Darsni yangilash (faqat teacher/admin)
router.put('/:id', requireRole(['teacher', 'admin']), updateLesson);
router.patch('/:id', requireRole(['teacher', 'admin']), updateLesson);

// 🗑️ Darsni o'chirish (faqat teacher/admin)
router.delete('/:id', requireRole(['teacher', 'admin']), deleteLesson);

// ✅ Darsni tugallash (faqat student)
router.post('/complete', requireRole(['student']), completeLesson);

// 📝 Test topshirish (faqat student)
router.post('/submit-test', requireRole(['student']), submitTest);

// 🔄 Quizni qayta urinish (faqat student)
router.post('/retry', requireRole(['student']), retryQuiz);

module.exports = router;