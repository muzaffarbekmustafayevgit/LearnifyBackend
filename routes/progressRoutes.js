const express = require('express');
const router = express.Router();
const auth = require('../middlewares/authMiddleware');
const progressController = require('../controllers/progressController');

router.get('/:courseId', auth(['student']), progressController.getProgress);
router.post('/complete', auth(['student']), progressController.markComplete);

module.exports = router;
