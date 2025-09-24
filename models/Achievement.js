const mongoose = require("mongoose");

const AchievementSchema = new mongoose.Schema({
  // Asosiy bog'lanishlar
  user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  course: { type: mongoose.Schema.Types.ObjectId, ref: "Course" }, // Kursga bog'liq emas bo'lishi mumkin
  lesson: { type: mongoose.Schema.Types.ObjectId, ref: "Lesson" }, // Darsga bog'liq yutuq
  module: { type: mongoose.Schema.Types.ObjectId, ref: "Module" }, // Modulga bog'liq yutuq

  // Yutuq ma'lumotlari
  badgeName: { type: String, required: true }, // Masalan: "Course Master – React"
  badgeType: { 
    type: String, 
    enum: [
      'course-completion', 
      'lesson-mastery', 
      'speed-run', 
      'perfectionist', 
      'streak', 
      'social', 
      'milestone',
      'special'
    ], 
    required: true 
  },
  badgeCategory: { 
    type: String, 
    enum: ['bronze', 'silver', 'gold', 'platinum', 'diamond'],
    default: 'bronze'
  },
  
  // Tavsif va kontent
  description: { type: String, default: "" },
  longDescription: { type: String }, // Batafsil tavsif
  icon: { type: String, required: true }, // Badge ikonkasi URL
  iconColor: { type: String, default: "#FFD700" }, // Badge rangi
  animation: { type: String }, // Animatsiya fayli (lottie/json)

  // Ball va mukofotlar
  points: { type: Number, default: 0 },
  xpReward: { type: Number, default: 0 }, // Tajriba ballari
  coinReward: { type: Number, default: 0 }, // Virtual tangalar
  bonusContent: { // Maxsus mukofot
    type: { type: String, enum: ['discount', 'content', 'badge', 'feature'] },
    value: mongoose.Schema.Types.Mixed,
    description: String
  },

  // Progress va qat'iyat
  progress: {
    current: { type: Number, default: 0 },
    target: { type: Number, default: 1 },
    percentage: { type: Number, default: 0 }
  },
  requirement: { 
    type: String, 
    enum: ['auto', 'manual', 'system'], 
    default: 'auto' 
  },
  criteria: { // Yutuq olish shartlari
    type: mongoose.Schema.Types.Mixed,
    default: {}
  },

  // Vaqt ma'lumotlari
  dateEarned: { type: Date, default: Date.now },
  dateStarted: { type: Date }, // Yutuq uchun ish boshlangan vaqt
  timeToComplete: { type: Number }, // Tugatish uchun sarflangan vaqt (soat)
  expiresAt: { type: Date }, // Muddatli yutuqlar uchun
  validUntil: { type: Date }, // Amal qilish muddati

  // Holat va ko'rinish
  status: { 
    type: String, 
    enum: ['in-progress', 'earned', 'locked', 'expired', 'revoked'], 
    default: 'earned' 
  },
  isSecret: { type: Boolean, default: false }, // Maxfiy yutuq
  isStackable: { type: Boolean, default: false }, // Bir necha marta olish mumkin
  isFeatured: { type: Boolean, default: false }, // Profilda ajratib ko'rsatish
  rarity: { 
    type: String, 
    enum: ['common', 'uncommon', 'rare', 'epic', 'legendary'],
    default: 'common'
  },

  // Social features
  shared: {
    isShared: { type: Boolean, default: false },
    sharedOn: [{ 
      platform: String,
      sharedAt: Date,
      shareUrl: String
    }]
  },
  congratulatoryMessage: { type: String }, // Tabrik xabari

  // Metadata
  metadata: {
    version: { type: String, default: "1.0" },
    gameified: { type: Boolean, default: true },
    difficulty: { 
      type: String, 
      enum: ['very-easy', 'easy', 'medium', 'hard', 'very-hard'],
      default: 'medium'
    }
  },

  // Statistika
  earnedCount: { type: Number, default: 1 }, // Stackable yutuqlar uchun
  globalRarity: { type: Number, default: 0 }, // Dunyo bo'yicha necha foiz foydalanuvchi olgan

  // Notification
  notificationSent: { type: Boolean, default: false },
  celebrated: { type: Boolean, default: false }, // Animatsiya ko'rsatilganmi

  updatedAt: { type: Date, default: Date.now }
});

// Indexlar
AchievementSchema.index({ user: 1, course: 1, badgeName: 1 }, { unique: true });
AchievementSchema.index({ user: 1, status: 1 });
AchievementSchema.index({ badgeType: 1 });
AchievementSchema.index({ badgeCategory: 1 });
AchievementSchema.index({ dateEarned: -1 });
AchievementSchema.index({ rarity: 1 });
AchievementSchema.index({ points: -1 });
AchievementSchema.index({ 'progress.percentage': -1 });
module.exports = mongoose.model("Achievement", AchievementSchema);
