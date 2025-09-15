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
const authMiddleware = require('../middlewares/authMiddleware');

const router = express.Router();

// 🔹 Course CRUD
router.post('/', authMiddleware(['teacher']), createCourse);        // Yaratish
router.get('/', authMiddleware(), getAllCourses);                  // Barcha kurslar
router.get('/my', authMiddleware(), getMyCourses);                 // Mening kurslarim
router.get('/:id', authMiddleware(), getCourse);                   // Bitta kurs
router.put('/:id', authMiddleware(['teacher']), updateCourse);     // Yangilash
router.delete('/:id', authMiddleware(['teacher']), deleteCourse);  // O‘chirish

// 🔹 Complete course (student)
router.post('/:id/complete', authMiddleware(['student']), completeCourse);

module.exports = router;
