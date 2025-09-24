const express = require('express');
const { completeLesson, updateProgress, getProgress } = require('../controllers/progressController');
const { requireRole } = require('../middlewares/authMiddleware'); // requireRole ni import qilamiz

const router = express.Router();

router.get('/:courseId', requireRole(['student']), getProgress);
router.patch('/:courseId', requireRole(['student']), updateProgress);
router.post('/:courseId/complete', requireRole(['student']), completeLesson);

module.exports = router;