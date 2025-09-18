const express = require('express');
const { check } = require('express-validator');
const { register, activate, login, logout, getProfile } = require('../controllers/authController');
const authMiddleware = require('../middlewares/authMiddleware');

const router = express.Router();

// 🔹 Register
router.post('/register', [
  check('name', 'Ism majburiy').notEmpty(),
  check('email', 'Email majburiy').isEmail(),
  check('password', 'Parol kamida 6 ta belgidan iborat bo‘lsin').isLength({ min: 6 })
], register);

// 🔹 Activate
router.post('/activate', activate);

// 🔹 Login
router.post('/login', [
  check('email', 'Email majburiy').isEmail(),
  check('password', 'Parol majburiy').exists()
], login);

// 🔹 Logout
router.post('/logout', authMiddleware(), logout);

// 🔹 Profile
router.get('/profile', authMiddleware(), getProfile);

module.exports = router;
