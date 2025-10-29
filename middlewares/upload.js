// middleware/upload.js
const multer = require('multer');
const path = require('path');

// Upload papkasini yaratish
const fs = require('fs');
const uploadDir = 'uploads/videos/';
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

// Fayl saqlash sozlamalari
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, uploadDir);
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, 'video-' + uniqueSuffix + path.extname(file.originalname));
  }
});

// Fayl turini tekshirish
const fileFilter = (req, file, cb) => {
  // Video fayllarni qabul qilish
  const videoMimeTypes = [
    'video/mp4',
    'video/mpeg',
    'video/ogg',
    'video/webm',
    'video/quicktime',
    'video/x-msvideo'
  ];

  if (videoMimeTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error(`Qo'llab-quvvatlanmaydigan fayl turi: ${file.mimetype}. Faqat video fayllarni yuklash mumkin!`), false);
  }
};

const upload = multer({
  storage: storage,
  fileFilter: fileFilter,
  limits: {
    fileSize: 500 * 1024 * 1024 // 500MB limit
  }
});

// Xatoliklarni boshqarish
const handleUploadError = (err, req, res, next) => {
  if (err instanceof multer.MulterError) {
    if (err.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({
        success: false,
        message: 'Fayl hajmi juda katta. Maksimal hajm: 500MB'
      });
    }
    if (err.code === 'LIMIT_UNEXPECTED_FILE') {
      return res.status(400).json({
        success: false,
        message: 'Kutilmagan fayl turi'
      });
    }
  }
  
  if (err) {
    return res.status(400).json({
      success: false,
      message: err.message
    });
  }
  
  next();
};

module.exports = { upload, handleUploadError };