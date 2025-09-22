const express = require('express');
const { authMiddleware } = require('../middlewares/authMiddleware');
const {
  createModule,
  getModule,
  updateModule,
  deleteModule,
  addLessonToModule
} = require('../controllers/moduleController');

const router = express.Router();

// 🔹 Module CRUD
router.post('/', authMiddleware(['teacher']), createModule);
router.get('/:id', authMiddleware(), getModule);
router.put('/:id', authMiddleware(['teacher']), updateModule);
router.delete('/:id', authMiddleware(['teacher']), deleteModule);

// 🔹 Lesson qo‘shish
router.post('/:id/lessons', authMiddleware(['teacher']), addLessonToModule);

module.exports = router;
