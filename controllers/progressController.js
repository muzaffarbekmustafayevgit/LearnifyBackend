const Progress = require('../models/Progress');
const Lesson = require('../models/Lesson');
const Course = require('../models/Course');

// Student darsni tugatdi deb belgilash
exports.completeLesson = async (req, res) => {
  try {
    const { courseId, lessonId } = req.body;
    const studentId = req.user.id;

    let progress = await Progress.findOne({ student: studentId, course: courseId });

    if (!progress) {
      progress = new Progress({ student: studentId, course: courseId, completedLessons: [] });
    }

    // dars allaqachon qo‘shilgan bo‘lsa qaytib qo‘shilmaydi
    if (!progress.completedLessons.includes(lessonId)) {
      progress.completedLessons.push(lessonId);
    }

    // umumiy foiz hisoblash
    const totalLessons = await Lesson.countDocuments({ course: courseId });
    const doneLessons = progress.completedLessons.length;
    progress.percentage = Math.round((doneLessons / totalLessons) * 100);

    // certificate sharti
    if (progress.percentage === 100 && !progress.certificateIssued) {
      progress.certificateIssued = true;
    }

    await progress.save();
    res.json(progress);
  } catch (error) {
    res.status(500).json({ message: 'Progressni yangilashda xatolik', error });
  }
};

// Kurs bo‘yicha progressni olish
exports.getProgress = async (req, res) => {
  try {
    const { courseId } = req.params;
    const studentId = req.user.id;

    const progress = await Progress.findOne({ student: studentId, course: courseId })
      .populate('completedLessons', 'title');

    if (!progress) return res.json({ message: 'Progress topilmadi', percentage: 0 });

    res.json(progress);
  } catch (error) {
    res.status(500).json({ message: 'Progressni olishda xatolik', error });
  }
};

// Sertifikat olish
exports.getCertificate = async (req, res) => {
  try {
    const { courseId } = req.params;
    const studentId = req.user.id;

    const progress = await Progress.findOne({ student: studentId, course: courseId })
      .populate('student', 'name email')
      .populate('course', 'title');

    if (!progress || !progress.certificateIssued) {
      return res.status(400).json({ message: 'Sertifikat hali tayyor emas' });
    }

    // oddiy sertifikat JSON
    res.json({
      certificate: {
        student: progress.student.name,
        course: progress.course.title,
        percentage: progress.percentage,
        issuedAt: progress.updatedAt
      }
    });
  } catch (error) {
    res.status(500).json({ message: 'Sertifikatni olishda xatolik', error });
  }
};
