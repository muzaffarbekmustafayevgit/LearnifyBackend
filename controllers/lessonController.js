const Lesson = require("../models/Lesson");
const Progress = require("../models/Progress");
const Certificate = require("../models/Certificate");
const User = require("../models/User");

// 🎬 Yangi video dars yaratish
exports.createLesson = async (req, res) => {
  try {
    const { title, description, courseId, moduleId, videoUrl, duration, order, isFree } = req.body;

    if (!title || !videoUrl || !courseId) {
      return res.status(400).json({ success: false, message: "Majburiy maydonlar to‘ldirilmagan" });
    }

    const lesson = new Lesson({
      title,
      description,
      course: courseId,
      module: moduleId,
      videoUrl,
      duration: duration || 0,
      order: order || 0,
      isFree: isFree || false,
      teacher: req.user.id,
      type: "video",
      status: "published"
    });

    await lesson.save();

    res.status(201).json({
      success: true,
      message: "Video dars muvaffaqiyatli yaratildi",
      lesson
    });
  } catch (err) {
    console.error("Dars yaratishda xatolik:", err);
    res.status(500).json({ success: false, message: err.message });
  }
};

// 📚 Kurs bo‘yicha barcha video darslarni olish
exports.getLessonsByCourse = async (req, res) => {
  try {
    const lessons = await Lesson.find({ course: req.params.courseId, isDeleted: false }).sort({ order: 1 });
    res.status(200).json({ success: true, data: lessons });
  } catch (err) {
    res.status(500).json({ success: false, message: "Darslarni olishda xatolik", error: err.message });
  }
};

// 🎥 Bitta darsni olish
exports.getLessonById = async (req, res) => {
  try {
    const lesson = await Lesson.findById(req.params.id);
    if (!lesson) return res.status(404).json({ success: false, message: "Dars topilmadi" });
    res.status(200).json({ success: true, data: lesson });
  } catch (err) {
    res.status(500).json({ success: false, message: "Xatolik", error: err.message });
  }
};

// ✏️ Video darsni yangilash
exports.updateLesson = async (req, res) => {
  try {
    const { title, description, videoUrl, duration, order, isFree } = req.body;
    const lesson = await Lesson.findById(req.params.id);

    if (!lesson) return res.status(404).json({ success: false, message: "Dars topilmadi" });

    if (lesson.teacher.toString() !== req.user.id && req.user.role !== "admin") {
      return res.status(403).json({ success: false, message: "Ruxsatingiz yo‘q" });
    }

    lesson.title = title || lesson.title;
    lesson.description = description || lesson.description;
    lesson.videoUrl = videoUrl || lesson.videoUrl;
    lesson.duration = duration || lesson.duration;
    lesson.order = order || lesson.order;
    lesson.isFree = isFree ?? lesson.isFree;
    lesson.updatedAt = Date.now();

    await lesson.save();
    res.status(200).json({ success: true, message: "Video dars yangilandi", data: lesson });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// 🗑️ Darsni o‘chirish
exports.deleteLesson = async (req, res) => {
  try {
    const lesson = await Lesson.findById(req.params.id);
    if (!lesson) return res.status(404).json({ success: false, message: "Dars topilmadi" });

    if (lesson.teacher.toString() !== req.user.id && req.user.role !== "admin") {
      return res.status(403).json({ success: false, message: "Ruxsatingiz yo‘q" });
    }

    lesson.isDeleted = true;
    await lesson.save();

    res.status(200).json({ success: true, message: "Dars o‘chirildi" });
  } catch (err) {
    res.status(500).json({ success: false, message: "Darsni o‘chirishda xatolik", error: err.message });
  }
};

// ✅ Darsni tugallash (faqat video ko‘rish uchun)
exports.completeLesson = async (req, res) => {
  try {
    const { courseId, lessonId } = req.body;
    const studentId = req.user.id;

    let progress = await Progress.findOne({ student: studentId, course: courseId });
    if (!progress) {
      progress = new Progress({ student: studentId, course: courseId, completedLessons: [] });
    }

    if (!progress.completedLessons.includes(lessonId)) {
      progress.completedLessons.push(lessonId);
    }

    const totalLessons = await Lesson.countDocuments({ course: courseId, isDeleted: false });
    progress.progress = Math.round((progress.completedLessons.length / totalLessons) * 100);

    const user = await User.findById(studentId);
    user.points += 10;

    if (user.points >= 200) user.rank = "Intermediate";
    if (user.points >= 500) user.rank = "Pro";

    await user.save();

    // Sertifikat
    if (progress.progress >= 70) {
      const certExists = await Certificate.findOne({ student: studentId, course: courseId });
      if (!certExists) {
        await Certificate.create({
          student: studentId,
          course: courseId,
          filePath: `certificates/${studentId}_${courseId}.pdf`
        });
      }
    }

    await progress.save();
    res.status(200).json({ success: true, progress });
  } catch (error) {
    res.status(500).json({ success: false, message: "Progressni yangilashda xatolik", error: error.message });
  }
};
exports.getLessonsByModule = async (req, res) => {
  try {
    const { moduleId } = req.params;
    const lessons = await Lesson.find({ module: moduleId });
    res.status(200).json({ success: true, lessons });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};
