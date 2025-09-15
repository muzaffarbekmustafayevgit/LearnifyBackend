const Course = require('../models/Course');

// ✅ Kurs yaratish
exports.createCourse = async (req, res) => {
  try {
    const { title, description } = req.body;
    const course = new Course({ title, description, teacher: req.user.id });
    await course.save();
    res.status(201).json({ message: 'Kurs yaratildi', course });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server xatosi' });
  }
};

// ✅ Barcha kurslar (faqat o‘chirilmaganlar)
exports.getAllCourses = async (req, res) => {
  try {
    const courses = await Course.find({ isDeleted: false }).populate('lessons');
    res.json(courses);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server xatosi' });
  }
};

// ✅ Mening kurslarim
exports.getMyCourses = async (req, res) => {
  try {
    const courses = await Course.find({ teacher: req.user.id, isDeleted: false }).populate('lessons');
    res.json(courses);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server xatosi' });
  }
};

// ✅ Kursni olish
exports.getCourse = async (req, res) => {
  try {
    const course = await Course.findById(req.params.id).populate('lessons');
    if (!course || course.isDeleted) return res.status(404).json({ message: 'Kurs topilmadi' });
    res.json(course);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server xatosi' });
  }
};

// ✅ Kurs yangilash
exports.updateCourse = async (req, res) => {
  try {
    const course = await Course.findOneAndUpdate(
      { _id: req.params.id, teacher: req.user.id, isDeleted: false },
      { title: req.body.title, description: req.body.description },
      { new: true }
    );
    if (!course) return res.status(404).json({ message: 'Kurs topilmadi yoki sizga tegishli emas' });
    res.json({ message: 'Kurs yangilandi', course });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server xatosi' });
  }
};

// ✅ Soft-delete (o‘chirish emas, belgilash)
exports.deleteCourse = async (req, res) => {
  try {
    const course = await Course.findOneAndUpdate(
      { _id: req.params.id, teacher: req.user.id, isDeleted: false },
      { isDeleted: true },
      { new: true }
    );
    if (!course) return res.status(404).json({ message: 'Kurs topilmadi yoki sizga tegishli emas' });
    res.json({ message: 'Kurs soft-delete qilindi', course });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server xatosi' });
  }
};

// ✅ Kursni tugallangan deb belgilash
exports.completeCourse = async (req, res) => {
  try {
    const { id } = req.params;

    const course = await Course.findById(id);
    if (!course || course.isDeleted) {
      return res.status(404).json({ message: "Kurs topilmadi" });
    }

    // faqat teacher yoki superAdmin belgila oladi
    if (req.user.role !== "teacher" && req.user.role !== "superAdmin") {
      return res.status(403).json({ message: "Access denied" });
    }

    if (course.isCompleted) {
      return res.status(400).json({ message: "Bu kurs allaqachon tugallangan deb belgilangan" });
    }

    course.isCompleted = true;
    await course.save();

    res.json({
      message: "✅ Kurs tugallangan deb belgilandi",
      course
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};
