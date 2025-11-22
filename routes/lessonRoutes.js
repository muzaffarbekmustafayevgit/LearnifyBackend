// routes/lessonRoutes.js - yangilangan versiya
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
  getLessonStats,
  uploadVideoOnly // ✅ Yangi funksiya qo'shamiz
} = require('../controllers/lessonController');

const { verifyToken, requireRole } = require('../middlewares/authMiddleware');
const upload = require('../middlewares/upload');

router.use(verifyToken);

// ✅ YANGI: Faqat video yuklash uchun endpoint
router.post(
  '/upload',
  requireRole(['teacher', 'admin']),
  upload.single('video'),
  uploadVideoOnly
);

// POST /api/lessons - yangi dars yaratish
router.post(
  '/',
  requireRole(['teacher', 'admin']),
  upload.single('video'),
  createLesson
);

// Qolgan routelar...
router.put('/:id', requireRole(['teacher', 'admin']), upload.single('video'), updateLesson);
router.get('/course/:courseId', getLessonsByCourse);
router.get('/module/:moduleId', getLessonsByModule);
router.get('/search', searchLessons);
router.get('/:id', getLessonById);
router.get('/:id/stats', requireRole(['teacher', 'admin']), getLessonStats);
router.patch('/:id', requireRole(['teacher', 'admin']), updateLesson);
router.delete('/:id', requireRole(['teacher', 'admin']), deleteLesson);
router.post('/complete', requireRole(['student']), completeLesson);

module.exports = router;