const express = require('express');
const router = express.Router();
const auth = require('../middlewares/authMiddleware');
const certificateController = require('../controllers/certificateController');

router.get('/:courseId', auth(['student']), certificateController.getMyCertificate);

module.exports = router;
