// routes/driveRoutes.js
const express = require("express");
const multer = require("multer");
const fs = require("fs");
const path = require("path");
const { 
  uploadFile, 
  listFiles, 
  testDrive, 
  getAuthUrl, 
  oauthCallback 
} = require("../Controllers/DriveController");

const router = express.Router();

console.log('🚀 DriveRoutes yuklandi!');

// Upload papkasini yaratish
const uploadPath = path.join(__dirname, "..", "uploads");
if (!fs.existsSync(uploadPath)) {
  fs.mkdirSync(uploadPath, { recursive: true });
  console.log('✅ Uploads papkasi yaratildi:', uploadPath);
}

// Multer sozlamasi
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadPath);
  },
  filename: (req, file, cb) => {
    const uniqueName = Date.now() + "-" + Math.round(Math.random() * 1E9) + path.extname(file.originalname);
    cb(null, uniqueName);
  },
});

const fileFilter = (req, file, cb) => {
  if (file.mimetype.startsWith('video/')) {
    cb(null, true);
  } else {
    cb(new Error('Faqat video fayllar yuklash mumkin!'), false);
  }
};

const upload = multer({
  storage: storage,
  fileFilter: fileFilter,
  limits: {
    fileSize: 100 * 1024 * 1024,
  },
});

// Test endpoint
router.get("/test", testDrive);

// Auth endpoints
router.get("/auth-url", getAuthUrl);
router.get("/oauth2callback", oauthCallback);

// 📤 Video yuklash
router.post("/upload", upload.single("video"), uploadFile);

// 📋 Fayllar ro'yxati
router.get("/list", listFiles);

module.exports = router;