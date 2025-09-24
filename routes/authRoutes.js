// routes/authRoutes.js
const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const { validateUser } = require('../middlewares/validationMiddleware');
const authMiddleware = require('../middlewares/authMiddleware');

// ================== PUBLIC ROUTES ==================

// Ro'yxatdan o'tish
router.post('/register', validateUser, authController.register);

// Hisobni aktivlashtirish
router.post('/activate', authController.activate);

// Kirish
router.post('/login', authController.login);

// Token yangilash
router.post('/refresh-token', authController.refreshToken);

// Parolni unutish
router.post('/forgot-password', authController.forgotPassword);

// Parolni tiklash
router.post('/reset-password', authController.resetPassword);

// ================== PROTECTED ROUTES ==================

// Chiqish
router.post('/logout', authMiddleware.verifyToken, authController.logout);

// Joriy foydalanuvchi ma'lumotlari
router.get('/me', authMiddleware.verifyToken, authController.getCurrentUser);

// Parolni yangilash
router.put('/change-password', authMiddleware.verifyToken, authController.changePassword);

// Profilni yangilash
router.put('/profile', authMiddleware.verifyToken, authController.updateProfile);

module.exports = router;