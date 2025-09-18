const express = require('express');
const { submitTest } = require('../controllers/testController');
const authMiddleware = require('../middlewares/authMiddleware');

const router = express.Router();

// 🔹 Submit test
router.post('/submit', authMiddleware(['student']), submitTest);

module.exports = router;
