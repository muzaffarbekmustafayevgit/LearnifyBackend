// routes/userRoutes.js
const express = require('express');
const router = express.Router();
const {
  getUsers,
  getUserById, 
  createUser,
  updateUser,
  deleteUser
} = require('../controllers/userController');
const {authMiddleware} = require('../middlewares/authMiddleware'); // To'g'ri import

// Har bir funksiyani tekshirish

// Faqat adminlar uchun route'lar
router.get('/', authMiddleware(['admin']), getUsers);
router.get('/:id', authMiddleware(['admin']), getUserById);
router.post('/', authMiddleware(['admin']), createUser);
router.put('/:id', authMiddleware(['admin']), updateUser);
router.delete('/:id', authMiddleware(['admin']), deleteUser);

module.exports = router;