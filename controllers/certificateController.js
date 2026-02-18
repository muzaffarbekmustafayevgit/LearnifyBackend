const Certificate = require('../models/Certificate');
const Enrollment = require('../models/Enrollment');
const Course = require('../models/Course');
const generateCertificateFile = require('../utils/generateCertificate');

const generateCertificateId = () =>
  `CERT-${Date.now()}-${Math.floor(1000 + Math.random() * 9000)}`;

const generateVerificationCode = () =>
  `VRF-${Math.random().toString(36).slice(2, 10).toUpperCase()}`;

exports.generateCertificate = async (req, res) => {
  try {
    const { courseId } = req.params;
    const studentId = req.user.id;

    const enrollment = await Enrollment.findOne({ student: studentId, course: courseId });
    if (!enrollment) {
      return res.status(404).json({
        success: false,
        message: "Siz ushbu kursga yozilmagansiz"
      });
    }

    const completion = enrollment.progress?.completionPercentage || 0;
    if (completion < 100) {
      return res.status(400).json({
        success: false,
        message: "Sertifikat olish uchun kursni 100% yakunlang",
        data: { completion }
      });
    }

    const existing = await Certificate.findOne({ student: studentId, course: courseId });
    if (existing) {
      return res.status(200).json({
        success: true,
        message: "Sertifikat allaqachon yaratilgan",
        data: { certificate: existing }
      });
    }

    const course = await Course.findById(courseId).select('title teacher');
    const filePath = await generateCertificateFile(studentId, course);

    const certificate = await Certificate.create({
      student: studentId,
      course: courseId,
      teacher: course?.teacher,
      certificateId: generateCertificateId(),
      title: `${course?.title || 'Course'} Completion Certificate`,
      description: "Kursni 100% yakunlaganlik uchun berildi",
      filePath,
      fileType: 'pdf',
      progressPercentage: completion,
      finalScore: completion,
      maxScore: 100,
      conditionMet: true,
      requirementsMet: {
        progress: true,
        score: true,
        quizzes: true,
        assignments: true,
        time: true
      },
      verification: {
        code: generateVerificationCode()
      },
      metadata: {
        completionDate: new Date()
      },
      createdBy: studentId
    });

    res.status(201).json({
      success: true,
      message: "Sertifikat muvaffaqiyatli yaratildi",
      data: { certificate }
    });
  } catch (err) {
    res.status(500).json({
      success: false,
      message: "Sertifikat yaratishda xatolik",
      error: err.message
    });
  }
};

exports.getMyCertificates = async (req, res) => {
  try {
    const certificates = await Certificate.find({ student: req.user.id })
      .populate('course', 'title')
      .sort({ issuedAt: -1 });

    res.json({
      success: true,
      data: { certificates }
    });
  } catch (err) {
    res.status(500).json({
      success: false,
      message: "Sertifikatlarni olishda xatolik",
      error: err.message
    });
  }
};
