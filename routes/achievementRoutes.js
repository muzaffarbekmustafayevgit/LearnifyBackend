const express = require('express');
const router = express.Router();
const achievementController = require('../controllers/achievementController');
const {authMiddleware} = require('../middlewares/authMiddleware');

// Foydalanuvchining o‘z achievements
router.get('/my', authMiddleware(), achievementController.getUserAchievements);

// Barcha achievements (leaderboard)
router.get('/', authMiddleware(), achievementController.getAllAchievements);

// Yangi achievement yaratish
router.post('/', authMiddleware(), achievementController.createAchievement);

module.exports = router;
