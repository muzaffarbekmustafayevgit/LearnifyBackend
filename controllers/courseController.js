const Course = require('../models/Course');

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

exports.getMyCourses = async (req, res) => {
  try {
    const courses = await Course.find({ teacher: req.user.id }).populate('lessons');
    res.json(courses);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server xatosi' });
  }
};

exports.getCourse = async (req, res) => {
  try {
    const course = await Course.findById(req.params.id).populate('lessons');
    if (!course) return res.status(404).json({ message: 'Kurs topilmadi' });
    res.json(course);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server xatosi' });
  }
};

exports.updateCourse = async (req, res) => {
  try {
    const course = await Course.findOneAndUpdate(
      { _id: req.params.id, teacher: req.user.id },
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

exports.deleteCourse = async (req, res) => {
  try {
    const course = await Course.findOneAndDelete({ _id: req.params.id, teacher: req.user.id });
    if (!course) return res.status(404).json({ message: 'Kurs topilmadi yoki sizga tegishli emas' });
    res.json({ message: 'Kurs o‘chirildi' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server xatosi' });
  }
};
