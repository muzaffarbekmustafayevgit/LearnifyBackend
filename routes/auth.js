// routes/auth.js
const express = require('express');
const router = express.Router();
const { body } = require('express-validator');
const authController = require('../controllers/authController');

// Register
router.post(
  '/register',
  [
    body('name').trim().notEmpty().withMessage('Name bo\'sh bo\'lmasin').isLength({ max: 100 }),
    body('email').isEmail().withMessage('To\'g\'ri email kiriting').normalizeEmail(),
    body('password').isLength({ min: 6 }).withMessage('Parol kamida 6 ta belgidan iborat bo\'lishi kerak'),
    body('role').optional().isIn(['student','teacher','admin']).withMessage('Noto\'g\'ri role')
  ],
  authController.register
);

// Login
router.post(
  '/login',
  [
    body('email').isEmail().withMessage('To\'g\'ri email kiriting').normalizeEmail(),
    body('password').notEmpty().withMessage('Parol talab qilinadi')
  ],
  authController.login
);

module.exports = router;
