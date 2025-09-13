const express = require('express');
const router = express.Router();
const { register, activate, login, logout } = require('../controllers/authController');



const { check } = require('express-validator');
router.post('/logout', logout);
// register
router.post('/register', [
  check('name', 'Ism majburiy').not().isEmpty(),
  check('email', 'Email majburiy').isEmail(),
  check('password', 'Parol kamida 6 ta belgidan iborat bo‘lsin').isLength({ min: 6 })
], register);

// activate
router.post('/activate', activate);

// login
router.post('/login', [
  check('email', 'Email majburiy').isEmail(),
  check('password', 'Parol majburiy').exists()
], login);

module.exports = router;
