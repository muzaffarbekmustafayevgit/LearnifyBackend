const Achievement = require("../models/Achievement");

// 🔹 Foydalanuvchining barcha badge’lari
exports.getUserAchievements = async (req, res) => {
  try {
    const achievements = await Achievement.find({ user: req.user._id })
      .populate("course", "title")
      .sort({ dateEarned: -1 });

    res.json(achievements);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// 🔹 Barcha achievement’lar (leaderboard uchun)
exports.getAllAchievements = async (req, res) => {
  try {
    const achievements = await Achievement.find()
      .populate("user", "name email")
      .populate("course", "title")
      .sort({ dateEarned: -1 });

    res.json(achievements);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// 🔹 Yangi achievement yaratish (masalan, kurs 100% tugaganda)
exports.createAchievement = async (req, res) => {
  try {
    const { courseId, badgeName, description, points } = req.body;

    const achievement = new Achievement({
      user: req.user._id,
      course: courseId,
      badgeName,
      description,
      points
    });

    await achievement.save();

    res.status(201).json(achievement);
  } catch (err) {
    if (err.code === 11000) {
      return res.status(400).json({ message: "Achievement already exists for this course." });
    }
    res.status(500).json({ message: err.message });
  }
};
