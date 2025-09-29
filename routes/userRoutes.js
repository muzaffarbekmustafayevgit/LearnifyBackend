// routes/userRoutes.js
const express = require('express');
const router = express.Router();
const {
  getUsers,
  getUserById,
  createUser,
  updateUser,
  deleteUser,
  getProfile,
  updateProfile
} = require('../controllers/userController');
const { requireRole, verifyToken } = require('../middlewares/authMiddleware');
const { validateUser } = require('../middlewares/validationMiddleware');

// Public routes - faqat token tekshirish
router.get('/profile', verifyToken, getProfile);
router.put('/profile', verifyToken, updateProfile);

// Admin only routes
router.get('/admin/users', verifyToken, requireRole(['admin']), getUsers);
router.get('/admin/users/:id', verifyToken, requireRole(['admin']), getUserById);
router.post('/admin/users', verifyToken, requireRole(['admin']), validateUser, createUser);
router.put('/admin/users/:id', verifyToken, requireRole(['admin']), validateUser, updateUser);
router.delete('/admin/users/:id', verifyToken, requireRole(['admin']), deleteUser);


module.exports = router;