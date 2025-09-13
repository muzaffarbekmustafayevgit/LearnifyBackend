const Lesson = require('../models/Lesson');

// Dars yaratish
exports.createLesson = async (req, res) => {
  try {
    const { courseId, title, content, materials, test } = req.body;

    const lesson = new Lesson({
      course: courseId,
      title,
      content,
      materials,
      test
    });

    await lesson.save();
    res.status(201).json(lesson);
  } catch (error) {
    res.status(500).json({ message: 'Dars yaratishda xatolik', error });
  }
};

// Kurs bo‘yicha barcha darslar
exports.getLessonsByCourse = async (req, res) => {
  try {
    const lessons = await Lesson.find({ course: req.params.courseId });
    res.json(lessons);
  } catch (error) {
    res.status(500).json({ message: 'Darslarni olishda xatolik', error });
  }
};

// Bitta darsni olish
exports.getLesson = async (req, res) => {
  try {
    const lesson = await Lesson.findById(req.params.id);
    if (!lesson) return res.status(404).json({ message: 'Dars topilmadi' });
    res.json(lesson);
  } catch (error) {
    res.status(500).json({ message: 'Darsni olishda xatolik', error });
  }
};

// Darsni yangilash
exports.updateLesson = async (req, res) => {
  try {
    const updated = await Lesson.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true }
    );
    if (!updated) return res.status(404).json({ message: 'Dars topilmadi' });
    res.json(updated);
  } catch (error) {
    res.status(500).json({ message: 'Darsni yangilashda xatolik', error });
  }
};

// Darsni o‘chirish
exports.deleteLesson = async (req, res) => {
  try {
    const deleted = await Lesson.findByIdAndDelete(req.params.id);
    if (!deleted) return res.status(404).json({ message: 'Dars topilmadi' });
    res.json({ message: 'Dars o‘chirildi' });
  } catch (error) {
    res.status(500).json({ message: 'Darsni o‘chirishda xatolik', error });
  }
};
