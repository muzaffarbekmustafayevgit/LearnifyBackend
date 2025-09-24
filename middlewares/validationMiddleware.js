// middlewares/validationMiddleware.js
const { body, validationResult } = require('express-validator');

const validateUser = [
  body('name')
    .trim()
    .isLength({ min: 2, max: 100 })
    .withMessage('Ism 2 dan 100 gacha belgidan iborat bo‘lishi kerak'),
  
  body('email')
    .isEmail()
    .normalizeEmail()
    .withMessage('Noto‘g‘ri email formati'),
  
  body('password')
    .optional()
    .isLength({ min: 6 })
    .withMessage('Parol kamida 6 ta belgidan iborat bo‘lishi kerak'),
  
  body('role')
    .optional()
    .isIn(['student', 'teacher', 'admin'])
    .withMessage('Noto‘g‘ri rol'),
  
  (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ 
        message: 'Validatsiya xatolari', 
        errors: errors.array() 
      });
    }
    next();
  }
];

module.exports = { validateUser };