const express = require('express');
const router = express.Router();
const achievementController = require('../controllers/achievementController');
const { verifyToken, requireRole } = require('../middlewares/authMiddleware');

// Foydalanuvchining o'z achievements
router.get('/my', verifyToken, achievementController.getUserAchievements);

// Barcha achievements (leaderboard)
router.get('/', verifyToken, achievementController.getAllAchievements);

// Yangi achievement yaratish (faqat admin/teacher)
router.post('/', verifyToken, requireRole(['admin', 'teacher']), achievementController.createAchievement);

module.exports = router;