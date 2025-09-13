const express = require('express');
const router = express.Router();
const auth = require('../middlewares/authMiddleware');
const controller = require('../controllers/progressController');

// Darsni tugatish
router.post('/complete', auth(['student']), controller.completeLesson);

// Kurs progressini olish
router.get('/:courseId', auth(['student']), controller.getProgress);

// Sertifikat olish
router.get('/:courseId/certificate', auth(['student']), controller.getCertificate);

module.exports = router;
