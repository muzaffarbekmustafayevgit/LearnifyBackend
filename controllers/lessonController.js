// controllers/lessonController.js

const Lesson = require("../models/Lesson");
const Progress = require("../models/Progress");
const Certificate = require("../models/Certificate");
const User = require("../models/User");

exports.submitTest = async (req, res) => {
  try {
    const { courseId, lessonId, answers } = req.body;
    const studentId = req.user.id;

    const lesson = await Lesson.findById(lessonId);
    if (!lesson) return res.status(404).json({ message: "Dars topilmadi" });
    if (!lesson.questions || lesson.questions.length === 0) {
      return res.status(400).json({ message: "Bu test emas" });
    }

    // Javoblarni tekshirish
    let correct = 0;
    lesson.questions.forEach((q, idx) => {
      if (answers[idx] !== undefined && answers[idx] === q.correctIndex) {
        correct++;
      }
    });

    const score = Math.round((correct / lesson.questions.length) * 100);

    // Progress yangilash
    let progress = await Progress.findOne({
      student: studentId,
      course: courseId,
    });
    if (!progress) {
      progress = new Progress({
        student: studentId,
        course: courseId,
        completedLessons: [],
      });
    }

    // ✅ faqat 100% to‘g‘ri bo‘lsa lesson complete
    if (score === 100 && !progress.completedLessons.includes(lessonId)) {
      progress.completedLessons.push(lessonId);
    }

    // Progress % hisoblash
    const totalLessons = await Lesson.countDocuments({ course: courseId });
    progress.progress = Math.round(
      (progress.completedLessons.length / totalLessons) * 100
    );

    // ✅ Sertifikat sharti
    if (progress.progress >= 70) {
      const certExists = await Certificate.findOne({
        student: studentId,
        course: courseId,
      });
      if (!certExists) {
        await Certificate.create({
          student: studentId,
          course: courseId,
          filePath: `certificates/${studentId}_${courseId}.pdf`,
        });
      }
    }

    // ✅ Gamification
    const user = await User.findById(studentId);
    if (score === 100) {
      user.points += 20; // test tugatilsa ko‘proq ball
    } else {
      user.points += 5; // urinib ko‘rsa ham ball
    }

    // Kurs tugallanganda badge berish
    if (progress.progress === 100) {
      const badgeName = `Course Master – ${course.title}`;

      if (!user.badges.includes(badgeName)) {
        user.badges.push(badgeName); // ✅ Har kurs uchun alohida badge
      }
    }

    if (user.points >= 200) user.rank = "Intermediate";
    if (user.points >= 500) user.rank = "Pro";

    await user.save();
    await progress.save();

    res.json({
      score,
      correct,
      total: lesson.questions.length,
      progress,
    });
  } catch (err) {
    res
      .status(500)
      .json({ message: "Testni tekshirishda xatolik", error: err.message });
  }
};

// ✅ Darsni oddiy tugallash (video/material/text uchun)
exports.completeLesson = async (req, res) => {
  try {
    const { courseId, lessonId } = req.body;
    const studentId = req.user.id;

    let progress = await Progress.findOne({
      student: studentId,
      course: courseId,
    });
    if (!progress) {
      progress = new Progress({
        student: studentId,
        course: courseId,
        completedLessons: [],
      });
    }

    if (!progress.completedLessons.includes(lessonId)) {
      progress.completedLessons.push(lessonId);
    }

    const totalLessons = await Lesson.countDocuments({ course: courseId });
    progress.progress = Math.round(
      (progress.completedLessons.length / totalLessons) * 100
    );

    // Gamification
    const user = await User.findById(studentId);
    user.points += 10; // oddiy lesson uchun
    if (user.points >= 200) user.rank = "Intermediate";
    if (user.points >= 500) user.rank = "Pro";
    await user.save();

    // Sertifikat
    if (progress.progress >= 70) {
      const certExists = await Certificate.findOne({
        student: studentId,
        course: courseId,
      });
      if (!certExists) {
        await Certificate.create({
          student: studentId,
          course: courseId,
          filePath: `certificates/${studentId}_${courseId}.pdf`,
        });
      }
    }

    await progress.save();
    res.json(progress);
  } catch (error) {
    res
      .status(500)
      .json({
        message: "Progressni yangilashda xatolik",
        error: error.message,
      });
  }
};
// Lesson yaratish
exports.createLesson = async (req, res) => {
  try {
    const { title, content, courseId } = req.body;
    const lesson = new Lesson({ title, content, course: courseId });
    await lesson.save();
    res.status(201).json({ message: "Lesson yaratildi", lesson });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// Kurs bo‘yicha barcha darslar
exports.getLessonsByCourse = async (req, res) => {
  try {
    const lessons = await Lesson.find({ course: req.params.courseId });
    res.json(lessons);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// Bitta dars
exports.getLessonById = async (req, res) => {
  try {
    const lesson = await Lesson.findById(req.params.id);
    if (!lesson) return res.status(404).json({ message: "Lesson topilmadi" });
    res.json(lesson);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// Yangilash
exports.updateLesson = async (req, res) => {
  try {
    const lesson = await Lesson.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true }
    );
    if (!lesson) return res.status(404).json({ message: "Lesson topilmadi" });
    res.json({ message: "Yangilandi", lesson });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// O‘chirish
exports.deleteLesson = async (req, res) => {
  try {
    const lesson = await Lesson.findByIdAndDelete(req.params.id);
    if (!lesson) return res.status(404).json({ message: "Lesson topilmadi" });
    res.json({ message: "O‘chirildi" });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// Testni qayta topshirish
exports.retryQuiz = async (req, res) => {
  try {
    // bu yerda submitTest logikasidan foydalanishingiz mumkin
    res.json({ message: "Testni qayta topshirish muvaffaqiyatli" });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};
