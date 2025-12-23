// routes/lessonRoutes.js - to'liq versiya
const express = require('express');
const router = express.Router();
const path = require('path');
const fs = require('fs');

const {
  createLesson,
  getLessonsByCourse,
  getLessonById,
  updateLesson,
  deleteLesson,
  completeLesson,
  getLessonsByModule,
  searchLessons,
  getLessonStats,
  restoreLesson,
  getTeacherLessonStats,
  previewLesson,
  uploadVideoOnly
} = require('../controllers/lessonController');

const { verifyToken, requireRole } = require('../middlewares/authMiddleware');
const upload = require('../middlewares/upload');

router.use(verifyToken);

// 📥 Fayl yuklash uchun multer middleware
const multer = require('multer');

// Vaqtinchalik papka uchun storage
const tempStorage = multer.diskStorage({
  destination: function (req, file, cb) {
    // Temp papkasini yaratish
    const tempDir = path.join(__dirname, '..', 'uploads', 'temp');
    if (!fs.existsSync(tempDir)) {
      fs.mkdirSync(tempDir, { recursive: true });
    }
    cb(null, tempDir);
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const originalName = path.parse(file.originalname).name;
    const extension = path.extname(file.originalname);
    const safeName = originalName.replace(/[^\w\s-]/g, '').replace(/\s+/g, '_');
    cb(null, `temp_${uniqueSuffix}_${safeName}${extension}`);
  }
});

// Video fayllar uchun multer konfiguratsiyasi (MAX 75MB)
const videoUpload = multer({
  storage: tempStorage,
  limits: {
    fileSize: 75 * 1024 * 1024, // 75MB - sizning talabingiz
  },
  fileFilter: (req, file, cb) => {
    // Faqat video fayllarni qabul qilish
    const allowedMimeTypes = [
      'video/mp4',
      'video/mkv',
      'video/avi',
      'video/mov',
      'video/webm',
      'video/x-msvideo',
      'video/quicktime',
      'video/x-matroska'
    ];
    
    if (allowedMimeTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Faqat video fayllar qabul qilinadi (MP4, MKV, AVI, MOV, WEBM)'), false);
    }
  }
}).single('video');

// ✅ YANGI: Faqat video yuklash uchun endpoint
router.post(
  '/upload',
  requireRole(['teacher', 'admin']),
  (req, res, next) => {
    videoUpload(req, res, (err) => {
      if (err) {
        // Multer xatolari
        if (err.code === 'LIMIT_FILE_SIZE') {
          return res.status(400).json({
            success: false,
            message: "Video hajmi 75MB dan oshmasligi kerak",
            maxSize: "75MB"
          });
        }
        if (err.message) {
          return res.status(400).json({
            success: false,
            message: err.message
          });
        }
        return res.status(500).json({
          success: false,
          message: "Fayl yuklashda xatolik"
        });
      }
      next();
    });
  },
  uploadVideoOnly
);

// POST /api/lessons - yangi dars yaratish
router.post(
  '/',
  requireRole(['teacher', 'admin']),
  (req, res, next) => {
    videoUpload(req, res, (err) => {
      if (err) {
        // Multer xatolari
        if (err.code === 'LIMIT_FILE_SIZE') {
          return res.status(400).json({
            success: false,
            message: "Video hajmi 75MB dan oshmasligi kerak",
            maxSize: "75MB"
          });
        }
        if (err.message) {
          return res.status(400).json({
            success: false,
            message: err.message
          });
        }
        return res.status(500).json({
          success: false,
          message: "Fayl yuklashda xatolik"
        });
      }
      next();
    });
  },
  createLesson
);

// PUT /api/lessons/:id - darsni yangilash
router.put(
  '/:id',
  requireRole(['teacher', 'admin']),
  (req, res, next) => {
    videoUpload(req, res, (err) => {
      if (err) {
        // Multer xatolari
        if (err.code === 'LIMIT_FILE_SIZE') {
          return res.status(400).json({
            success: false,
            message: "Video hajmi 75MB dan oshmasligi kerak",
            maxSize: "75MB"
          });
        }
        if (err.message) {
          return res.status(400).json({
            success: false,
            message: err.message
          });
        }
        return res.status(500).json({
          success: false,
          message: "Fayl yuklashda xatolik"
        });
      }
      next();
    });
  },
  updateLesson
);

// PATCH /api/lessons/:id - darsni qisman yangilash (video siz)
router.patch(
  '/:id',
  requireRole(['teacher', 'admin']),
  updateLesson
);

// 📚 GET /api/lessons/course/:courseId - kurs bo'yicha darslar
router.get('/course/:courseId', getLessonsByCourse);

// 📂 GET /api/lessons/module/:moduleId - modul bo'yicha darslar
router.get('/module/:moduleId', getLessonsByModule);

// 🔍 GET /api/lessons/search - darslarni qidirish
router.get('/search', searchLessons);

// 🎥 GET /api/lessons/:id - bitta darsni olish
router.get('/:id', getLessonById);

// 👁️ GET /api/lessons/preview/:id - darsni ko'rib chiqish (preview)
router.get('/preview/:id', previewLesson);

// 📊 GET /api/lessons/:id/stats - dars statistikasi
router.get('/:id/stats', requireRole(['teacher', 'admin']), getLessonStats);

// 👨‍🏫 GET /api/lessons/teacher/stats - o'qituvchi darslari statistikasi
router.get('/teacher/stats', requireRole(['teacher', 'admin']), getTeacherLessonStats);

// 🗑️ DELETE /api/lessons/:id - darsni o'chirish
router.delete('/:id', requireRole(['teacher', 'admin']), deleteLesson);

// 🔄 PATCH /api/lessons/restore/:id - darsni qayta faollashtirish
router.patch('/restore/:id', requireRole(['teacher', 'admin']), restoreLesson);

// ✅ POST /api/lessons/complete - darsni tugallash
router.post('/complete', requireRole(['student']), completeLesson);

// 🎬 GET /api/lessons/video/:filename - video streaming
router.get('/video/:filename', (req, res) => {
  const { filename } = req.params;
  const videoPath = path.join(__dirname, '..', 'uploads', 'videos', filename);
  
  // Fayl mavjudligini tekshirish
  if (!fs.existsSync(videoPath)) {
    return res.status(404).json({ 
      success: false, 
      message: 'Video topilmadi' 
    });
  }

  const stat = fs.statSync(videoPath);
  const fileSize = stat.size;
  const range = req.headers.range;

  // Video streaming uchun headers
  if (range) {
    const parts = range.replace(/bytes=/, "").split("-");
    const start = parseInt(parts[0], 10);
    const end = parts[1] ? parseInt(parts[1], 10) : fileSize - 1;
    const chunksize = (end - start) + 1;
    const file = fs.createReadStream(videoPath, { start, end });
    const head = {
      'Content-Range': `bytes ${start}-${end}/${fileSize}`,
      'Accept-Ranges': 'bytes',
      'Content-Length': chunksize,
      'Content-Type': 'video/mp4',
    };
    res.writeHead(206, head);
    file.pipe(res);
  } else {
    const head = {
      'Content-Length': fileSize,
      'Content-Type': 'video/mp4',
      'Cache-Control': 'public, max-age=31536000' // 1 yil cache
    };
    res.writeHead(200, head);
    fs.createReadStream(videoPath).pipe(res);
  }
});

// 📄 GET /api/lessons/video/info/:filename - video ma'lumotlari
router.get('/video/info/:filename', (req, res) => {
  const { filename } = req.params;
  const videoPath = path.join(__dirname, '..', 'uploads', 'videos', filename);
  
  if (!fs.existsSync(videoPath)) {
    return res.status(404).json({ 
      success: false, 
      message: 'Video topilmadi' 
    });
  }

  const stat = fs.statSync(videoPath);
  const fileSize = stat.size;
  const created = stat.birthtime;
  const modified = stat.mtime;

  res.status(200).json({
    success: true,
    data: {
      filename,
      size: fileSize,
      sizeMB: (fileSize / (1024 * 1024)).toFixed(2),
      created,
      modified,
      url: `/api/lessons/video/${filename}`,
      publicUrl: `${req.protocol}://${req.get('host')}/api/lessons/video/${filename}`
    }
  });
});

module.exports = router;