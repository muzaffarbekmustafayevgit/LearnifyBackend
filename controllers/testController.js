const Lesson = require('../models/Lesson');
const Progress = require('../models/Progress');
const Certificate = require('../models/Certificate');

exports.submitTest = async (req, res) => {
  try {
    const { courseId, lessonId, answers } = req.body;
    const studentId = req.user.id;

    const lesson = await Lesson.findById(lessonId);
    if (!lesson) return res.status(404).json({ message: 'Dars topilmadi' });

    let correct = 0;
    lesson.testQuestions.forEach((q, idx) => {
      if (answers[idx] && answers[idx] === q.correctAnswer) correct++;
    });

    const score = Math.round((correct / lesson.testQuestions.length) * 100);

    // progress yangilash
    let progress = await Progress.findOne({ student: studentId, course: courseId });
    if (!progress) {
      progress = new Progress({ student: studentId, course: courseId, completedLessons: [] });
    }

    if (!progress.completedLessons.includes(lessonId)) {
      progress.completedLessons.push(lessonId);
    }

    const totalLessons = await Lesson.countDocuments({ course: courseId });
    progress.percentage = Math.round((progress.completedLessons.length / totalLessons) * 100);

    if (progress.percentage === 100) {
      const certExists = await Certificate.findOne({ student: studentId, course: courseId });
      if (!certExists) {
        await Certificate.create({
          student: studentId,
          course: courseId,
          percentage: progress.percentage
        });
      }
    }

    await progress.save();

    res.json({ score, correct, total: lesson.testQuestions.length, progress });
  } catch (err) {
    res.status(500).json({ message: 'Testni tekshirishda xatolik', error: err.message });
  }
};
