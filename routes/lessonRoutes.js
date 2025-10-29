// routes/lessonRoutes.js
const express = require('express');
const router = express.Router();
const {
  createLesson,
  getLessonsByCourse,
  getLessonById,
  updateLesson,
  deleteLesson,
  completeLesson,
  getLessonsByModule,
  searchLessons,
  getLessonStats
} = require('../controllers/lessonController');
const { verifyToken, requireRole } = require('../middlewares/authMiddleware');
const { upload, handleUploadError } = require('../middlewares/upload');

// 🔐 Barcha route'lar uchun auth majburiy
router.use(verifyToken);

// 🎬 DARS YARATISH VA YUKLASH
// POST /api/lessons - Yangi video dars yaratish
router.post(
  '/',
  requireRole(['teacher', 'admin']),
  upload.single('video'),
  handleUploadError,
  createLesson
);

// 📚 DARSLARNI OLISH
// GET /api/lessons/course/:courseId - Kurs bo'yicha darslar
router.get('/course/:courseId', getLessonsByCourse);

// GET /api/lessons/module/:moduleId - Modul bo'yicha darslar
router.get('/module/:moduleId', getLessonsByModule);

// GET /api/lessons/search - Darslarni qidirish
router.get('/search', searchLessons);

// GET /api/lessons/:id - Bitta darsni olish
router.get('/:id', getLessonById);

// 📊 DARS STATISTIKASI
// GET /api/lessons/:id/stats - Dars statistikasi
router.get('/:id/stats', requireRole(['teacher', 'admin']), getLessonStats);

// ✏️ DARSNI YANGILASH
// PUT /api/lessons/:id - Darsni yangilash (video fayl bilan)
router.put(
  '/:id',
  requireRole(['teacher', 'admin']),
  upload.single('video'),
  handleUploadError,
  updateLesson
);

// PATCH /api/lessons/:id - Darsni qisman yangilash
router.patch('/:id', requireRole(['teacher', 'admin']), updateLesson);

// 🗑️ DARSNI O'CHIRISH
// DELETE /api/lessons/:id - Darsni o'chirish
router.delete('/:id', requireRole(['teacher', 'admin']), deleteLesson);

// ✅ DARSNI TUGALLASH
// POST /api/lessons/complete - Darsni tugallash (studentlar uchun)
router.post('/complete', requireRole(['student']), completeLesson);

module.exports = router;