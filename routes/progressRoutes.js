const express = require('express');
const { completeLesson, updateProgress, getProgress } = require('../controllers/progressController');
const authMiddleware = require('../middlewares/authMiddleware');

const router = express.Router();

router.get('/:courseId', authMiddleware(['student']), getProgress);
router.patch('/:courseId', authMiddleware(['student']), updateProgress);
router.post('/:courseId/complete', authMiddleware(['student']), completeLesson);

module.exports = router;
