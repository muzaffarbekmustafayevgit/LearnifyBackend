const express = require('express');
const {
  createLesson,
  getLessonsByCourse,
  getLessonById,
  updateLesson,
  deleteLesson,
  completeLesson,
  getLessonsByModule
} = require('../controllers/lessonController');
const { verifyToken, requireRole } = require('../middlewares/authMiddleware');

const router = express.Router();

// 🔐 Auth majburiy
router.use(verifyToken);

// ➕ Video dars yaratish (teacher/admin)
router.post('/', requireRole(['teacher', 'admin']), createLesson);

// 🔍 Kurs bo‘yicha video darslar
router.get('/course/:courseId', getLessonsByCourse);

// 🔍 Darsni olish
router.get('/:id', getLessonById);
// GET /api/lessons/module/:moduleId
router.get('/module/:moduleId', getLessonsByModule);
// ✏️ Darsni yangilash
router.put('/:id', requireRole(['teacher', 'admin']), updateLesson);
router.patch('/:id', requireRole(['teacher', 'admin']), updateLesson);

// 🗑️ Darsni o‘chirish
router.delete('/:id', requireRole(['teacher', 'admin']), deleteLesson);

// ✅ Darsni tugallash (student)
router.post('/complete', requireRole(['student']), completeLesson);

module.exports = router;
