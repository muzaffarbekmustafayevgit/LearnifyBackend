// routes/testRoutes.js
const express = require('express');
const { submitTest } = require('../controllers/testController');
const { 
  verifyToken, 
  requireRole 
} = require('../middlewares/authMiddleware'); // middleware (birlik) papkasi

const router = express.Router();

// 🔐 Barcha route'lar token talab qiladi
router.use(verifyToken);

// 📝 Test topshirish (faqat student)
router.post('/submit', requireRole(['student']), submitTest);

module.exports = router;