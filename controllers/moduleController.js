const Module = require('../models/Module');
const Course = require('../models/Course');
const Lesson = require('../models/Lesson');

// ✅ Module yaratish (faqat teacher)
exports.createModule = async (req, res) => {
  try {
    const { title, description, courseId } = req.body;

    const course = await Course.findById(courseId);
    if (!course || course.isDeleted) {
      return res.status(404).json({ message: "Kurs topilmadi" });
    }

    if (course.teacher.toString() !== req.user.id && req.user.role !== 'superAdmin') {
      return res.status(403).json({ message: "Sizga ruxsat yo‘q" });
    }

    const newModule = new Module({
      title,
      description,
      course: courseId
    });

    await newModule.save();

    // 🔥 ENG MUHIM QATORLAR
    course.modules.push(newModule._id);
    await course.save();

    res.status(201).json({
      message: "Module yaratildi",
      module: newModule
    });

  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server xatosi" });
  }
};


// ✅ Module olish
exports.getModule = async (req, res) => {
  try {
    const module = await Module.findById(req.params.id).populate('lessons');
    if (!module || module.isDeleted) return res.status(404).json({ message: "Module topilmadi" });

    res.json(module);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server xatosi" });
  }
};

// ✅ Module yangilash
exports.updateModule = async (req, res) => {
  try {
    const { title, description } = req.body;

    const module = await Module.findById(req.params.id);
    if (!module || module.isDeleted) return res.status(404).json({ message: "Module topilmadi" });

    const course = await Course.findById(module.course);
    if (!course) return res.status(404).json({ message: "Kurs topilmadi" });

    if (course.teacher.toString() !== req.user.id && req.user.role !== 'superAdmin') {
      return res.status(403).json({ message: "Sizga ruxsat yo‘q" });
    }

    module.title = title || module.title;
    module.description = description || module.description;
    await module.save();

    res.json({ message: "Module yangilandi", module });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server xatosi" });
  }
};

// ✅ Module o‘chirish (soft-delete)
exports.deleteModule = async (req, res) => {
  try {
    const module = await Module.findById(req.params.id);
    if (!module || module.isDeleted) return res.status(404).json({ message: "Module topilmadi" });

    const course = await Course.findById(module.course);
    if (!course) return res.status(404).json({ message: "Kurs topilmadi" });

    if (course.teacher.toString() !== req.user.id && req.user.role !== 'superAdmin') {
      return res.status(403).json({ message: "Sizga ruxsat yo‘q" });
    }

    module.isDeleted = true;
    await module.save();

    res.json({ message: "Module o‘chirildi" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server xatosi" });
  }
};

// ✅ Lesson qo‘shish (modulega)
exports.addLessonToModule = async (req, res) => {
  try {
    const { lessonId } = req.body;
    const module = await Module.findById(req.params.id);
    if (!module || module.isDeleted) return res.status(404).json({ message: "Module topilmadi" });

    const course = await Course.findById(module.course);
    if (!course) return res.status(404).json({ message: "Kurs topilmadi" });

    if (course.teacher.toString() !== req.user.id && req.user.role !== 'superAdmin') {
      return res.status(403).json({ message: "Sizga ruxsat yo‘q" });
    }

    const lesson = await Lesson.findById(lessonId);
    if (!lesson) return res.status(404).json({ message: "Lesson topilmadi" });

    module.lessons.push(lessonId);
    await module.save();

    res.json({ message: "Lesson modulega qo‘shildi", module });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server xatosi" });
  }
};

exports.getModulesByCourse = async (req, res) => {
  try {
    const { courseId } = req.params;
    const modules = await Module.find({ course: courseId, isDeleted: false })
      .sort({ order: 1 })
      .lean();

    const modulesWithLessons = await Promise.all(
      modules.map(async (module) => {
        const lessons = await Lesson.find({
          course: courseId,
          module: module._id,
          isDeleted: false,
          status: { $ne: 'archived' }
        })
          .select('title duration type order videoUrl status')
          .sort({ order: 1 })
          .lean();

        return {
          ...module,
          lessons
        };
      })
    );

    res.status(200).json({
      success: true,
      data: { modules: modulesWithLessons },
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: "Modulelarni olishda xatolik" });
  }
};
