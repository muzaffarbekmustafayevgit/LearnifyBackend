const express = require('express');
const { 
  createModule, 
  getModule, 
  updateModule, 
  deleteModule, 
  addLessonToModule,
  getModulesByCourse 
} = require('../controllers/moduleController');
const { verifyToken, requireRole } = require('../middlewares/authMiddleware');

const router = express.Router();

// 🔐 Barcha route'lar token talab qiladi
router.use(verifyToken);

// 📚 Module CRUD operatsiyalari

// ➕ Yangi module yaratish (faqat teacher/admin)
router.post('/', requireRole(['teacher', 'admin']), createModule);

// 🔍 Kurs bo'yicha modulelarni olish
router.get('/course/:courseId', getModulesByCourse);

// 🔍 Moduleni ID bo'yicha olish
router.get('/:id', getModule);

// ✏️ Moduleni yangilash (faqat teacher/admin)
router.put('/:id', requireRole(['teacher', 'admin']), updateModule);

// 🗑️ Moduleni o'chirish (faqat teacher/admin)
router.delete('/:id', requireRole(['teacher', 'admin']), deleteModule);

// ➕ Modulega lesson qo'shish (faqat teacher/admin)
router.post('/:id/lessons', requireRole(['teacher', 'admin']), addLessonToModule);

module.exports = router;