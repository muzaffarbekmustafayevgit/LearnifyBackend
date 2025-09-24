// routes/moduleRoutes.js
const express = require('express');
const {
  createModule,
  getModule,
  updateModule,
  deleteModule,
  addLessonToModule
} = require('../controllers/moduleController');
const { 
  verifyToken, 
  requireRole 
} = require('../middlewares/authMiddleware'); // middlewares (ko'plik) papkasi

const router = express.Router();

// 🔐 Barcha route'lar token talab qiladi
router.use(verifyToken);

// 📚 Module CRUD operatsiyalari
router.post('/', requireRole(['teacher', 'admin']), createModule);
router.get('/:id', getModule);
router.put('/:id', requireRole(['teacher', 'admin']), updateModule);
router.delete('/:id', requireRole(['teacher', 'admin']), deleteModule);
router.post('/:id/lessons', requireRole(['teacher', 'admin']), addLessonToModule);

module.exports = router;