const express = require('express');
const router = express.Router();
const auth = require('../middlewares/authMiddleware');
const controller = require('../controllers/courseController');

// Kurs yaratish (faqat teacher)
router.post('/', auth(['teacher']), controller.createCourse);

// Teacher o‘z kurslarini ko‘rishi
router.get('/my', auth(['teacher']), controller.getMyCourses);

// Barcha kurslarni ko‘rish (student/teacher/admin)
router.get('/', auth([]), controller.getAllCourses);

// Kursni ID bo‘yicha ko‘rish
router.get('/:id', auth([]), controller.getCourse);

// Kursni yangilash (faqat teacher)
router.put('/:id', auth(['teacher']), controller.updateCourse);

// Kursni o‘chirish (faqat teacher)
router.delete('/:id', auth(['teacher']), controller.deleteCourse);

module.exports = router;
