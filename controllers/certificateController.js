const Certificate = require('../models/Certificate');

exports.getMyCertificate = async (req, res) => {
  try {
    const { courseId } = req.params;
    const studentId = req.user.id;

    const certificate = await Certificate.findOne({ student: studentId, course: courseId })
      .populate('student', 'name email')
      .populate('course', 'title');

    if (!certificate) return res.status(404).json({ message: 'Sertifikat topilmadi' });

    res.json({
      certificate: {
        student: certificate.student.name,
        email: certificate.student.email,
        course: certificate.course.title,
        percentage: certificate.percentage,
        issuedAt: certificate.issuedAt
      }
    });
  } catch (err) {
    res.status(500).json({ message: 'Sertifikatni olishda xatolik', error: err.message });
  }
};
