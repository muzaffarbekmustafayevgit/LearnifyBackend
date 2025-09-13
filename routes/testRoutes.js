const express = require('express');
const router = express.Router();
const auth = require('../middlewares/authMiddleware');
const testController = require('../controllers/testController');

router.post('/submit', auth(['student']), testController.submitTest);

module.exports = router;
