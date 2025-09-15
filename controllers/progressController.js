// controllers/progressController.js
const Progress = require('../models/Progress');
const Lesson = require('../models/Lesson');
const User = require('../models/User');

// ✅ Student progressni olish
exports.getProgress = async (req, res) => {
  try {
    const { courseId } = req.params;
    const studentId = req.user.id;

    const progress = await Progress.findOne({ student: studentId, course: courseId });
    if (!progress) return res.status(404).json({ message: 'Progress topilmadi' });

    res.json(progress);
  } catch (err) {
    res.status(500).json({ message: 'Progressni olishda xatolik', error: err.message });
  }
};

// ✅ Darsni tugallash
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

    const totalLessons = await Lesson.countDocuments({ course: courseId });
    progress.percentage = Math.round((progress.completedLessons.length / totalLessons) * 100);

    // Gamification
    const user = await User.findById(studentId);
    user.points += 10;
    if (user.points >= 200) user.rank = 'Intermediate';
    if (user.points >= 500) user.rank = 'Pro';
    await user.save();

    // Certificate sharti
    if (progress.percentage >= 70 && !progress.certificateIssued) {
      progress.certificateIssued = true;
    }

    await progress.save();
    res.json(progress);
  } catch (error) {
    res.status(500).json({ message: 'Progressni yangilashda xatolik', error });
  }
};

// ✅ Progressni yangilash
exports.updateProgress = async (req, res) => {
  try {
    const { courseId } = req.params;
    const { completedLessons } = req.body;
    const studentId = req.user.id;

    const progress = await Progress.findOneAndUpdate(
      { student: studentId, course: courseId },
      { completedLessons },
      { new: true }
    );

    if (!progress) return res.status(404).json({ message: 'Progress topilmadi' });

    res.json(progress);
  } catch (err) {
    res.status(500).json({ message: 'Progressni yangilashda xatolik', error: err.message });
  }
};
