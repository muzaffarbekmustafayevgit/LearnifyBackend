// ✅ controllers/certificateController.js (NEW or UPDATED)
const Certificate = require('../models/Certificate');
const Progress = require('../models/Progress'); // Progress modelni ham chaqirish
const User = require('../models/User'); // Kerak bo'lsa

// Funksiyani umumiy qilib yaratish
exports.generateCertificate = async (req, res) => {
  try {
    const { courseId } = req.params;
    const studentId = req.user.id;

    // Talaba progressini tekshirish
    const progress = await Progress.findOne({ student: studentId, course: courseId });
    if (!progress || progress.percentage < 70) {
      return res.status(400).json({ message: 'Kurs tugallanmagan yoki shartlar bajarilmagan' });
    }

    // Sertifikat allaqachon berilganini tekshirish
    const existingCert = await Certificate.findOne({ student: studentId, course: courseId });
    if (existingCert) {
      return res.status(200).json({ message: 'Sertifikat allaqachon mavjud', certificate: existingCert });
    }

    // Yangi sertifikat yaratish
    const newCertificate = await Certificate.create({
      student: studentId,
      course: courseId,
      percentage: progress.percentage,
      issuedAt: new Date(),
    });

    // Progressni yangilash
    progress.certificateIssued = true;
    await progress.save();

    res.status(201).json({ message: 'Sertifikat muvaffaqiyatli yaratildi', certificate: newCertificate });

  } catch (err) {
    res.status(500).json({ message: 'Sertifikat yaratishda xatolik', error: err.message });
  }
};

// Talabaning barcha sertifikatlarini olish
exports.getMyCertificates = async (req, res) => {
  try {
    const certificates = await Certificate.find({ student: req.user.id })
      .populate('course', 'title');

    res.json({ certificates });
  } catch (err) {
    res.status(500).json({ message: 'Sertifikatlarni olishda xatolik', error: err.message });
  }
};