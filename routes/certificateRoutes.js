const express = require('express');
const { generateCertificate, getMyCertificates } = require('../controllers/certificateController');
const authMiddleware = require('../middlewares/authMiddleware');

const router = express.Router();

// 🔹 Sertifikatlar
router.post('/:courseId', authMiddleware(['student']), generateCertificate); // Kurs tugagach sertifikat olish
router.get('/my', authMiddleware(['student']), getMyCertificates);             // O‘z sertifikatlarini ko‘rish

module.exports = router;
