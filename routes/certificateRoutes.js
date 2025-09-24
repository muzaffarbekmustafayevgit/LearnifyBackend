const express = require('express');
const { generateCertificate, getMyCertificates } = require('../controllers/certificateController');
const { requireRole } = require('../middlewares/authMiddleware'); // requireRole ni import qilamiz

const router = express.Router();

// 🔹 Sertifikatlar
router.post('/:courseId', requireRole(['student']), generateCertificate); // Kurs tugagach sertifikat olish
router.get('/my', requireRole(['student']), getMyCertificates);             // O'z sertifikatlarini ko'rish

module.exports = router;