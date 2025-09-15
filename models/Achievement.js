const mongoose = require("mongoose");

const AchievementSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  course: { type: mongoose.Schema.Types.ObjectId, ref: "Course", required: true },
  badgeName: { type: String, required: true }, // Masalan: "Course Master – React"
  description: { type: String, default: "" },  // Qo‘shimcha izoh
  points: { type: Number, default: 0 },        // Gamification uchun
  dateEarned: { type: Date, default: Date.now }
});

AchievementSchema.index({ user: 1, course: 1, badgeName: 1 }, { unique: true });

module.exports = mongoose.model("Achievement", AchievementSchema);
