// routes/courseRoutes.js
const express = require('express');
const router = express.Router();
const courseController = require('../controllers/courseController');
const { 
  verifyToken, 
  verifyTeacher, 
  verifyAdmin, 
  requireRole 
} = require('../middlewares/authMiddleware');

// 🔐 Barcha route'lar token talab qiladi
router.use(verifyToken);

// 📚 Barcha kurslarni olish (hammaga ochiq)
router.get('/', courseController.getAllCourses);

// 👨‍🏫 Faqat teacher/admin uchun kurs yaratish
router.post('/', requireRole(['teacher', 'admin']), courseController.createCourse);

// 👨‍🏫 Mening kurslarim (teacher/admin uchun)
router.get('/my-courses', requireRole(['teacher', 'admin']), courseController.getMyCourses);

// 🔍 Bitta kursni olish (hammaga ochiq, lekin draft kurslar faqat muallif/admin ko'ra oladi)
router.get('/:id', courseController.getCourse);

// ✏️ Kursni yangilash (faqat muallif/admin)
router.put('/:id', requireRole(['teacher', 'admin']), courseController.updateCourse);

// 🗑️ Kursni o'chirish (faqat muallif/admin)
router.delete('/:id', requireRole(['teacher', 'admin']), courseController.deleteCourse);

// 📢 Kursni nashr qilish (faqat muallif/admin)
router.patch('/:id/publish', requireRole(['teacher', 'admin']), courseController.publishCourse);

// ✅ Kursni tugallangan deb belgilash (faqat muallif/admin)
router.patch('/:id/complete', requireRole(['teacher', 'admin']), courseController.completeCourse);

// 📊 Kurs statistikasi (faqat muallif/admin)
router.get('/:id/stats', requireRole(['teacher', 'admin']), courseController.getCourseStats);

module.exports = router;