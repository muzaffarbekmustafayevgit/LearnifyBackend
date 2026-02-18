const express = require('express');
const { generateCertificate, getMyCertificates } = require('../controllers/certificateController');
const { verifyToken, requireRole } = require('../middlewares/authMiddleware');

const router = express.Router();
router.use(verifyToken);

// 🔹 Sertifikatlar
router.post('/:courseId', requireRole(['student']), generateCertificate); // Kurs tugagach sertifikat olish
router.get('/my', requireRole(['student']), getMyCertificates);             // O'z sertifikatlarini ko'rish

module.exports = router;
