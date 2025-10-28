// Controllers/DriveController.js - To'liq versiya
const { google } = require("googleapis");
const fs = require("fs");
const path = require("path");
require("dotenv").config();

console.log('🔧 DriveController yuklandi');

// OAuth2 client
const oauth2Client = new google.auth.OAuth2(
  process.env.GOOGLE_CLIENT_ID,
  process.env.GOOGLE_CLIENT_SECRET,
  process.env.GOOGLE_REDIRECT_URI
);

let drive;

// Auth holatini tekshirish
if (process.env.GOOGLE_REFRESH_TOKEN) {
  oauth2Client.setCredentials({
    refresh_token: process.env.GOOGLE_REFRESH_TOKEN,
  });
  
  drive = google.drive({
    version: "v3",
    auth: oauth2Client,
  });
  
  console.log('✅ Google Drive client muvaffaqiyatli yuklandi');
} else {
  console.log('⚠️ Google Drive: Refresh token mavjud emas. OAuth kerak.');
}

// 📤 Video yuklash
exports.uploadFile = async (req, res) => {
  console.log('📤 Upload boshlandi...');
  
  try {
    if (!req.file) {
      return res.status(400).json({ message: "Hech qanday fayl yuborilmadi" });
    }

    console.log('📁 Qabul qilingan fayl:', req.file.originalname);

    // Agar Drive mavjud bo'lmasa, lokal saqlash
    if (!drive) {
      return await uploadToLocal(req, res);
    }

    const filePath = req.file.path;

    if (!fs.existsSync(filePath)) {
      return res.status(400).json({ message: "Fayl topilmadi" });
    }

    const fileMetadata = {
      name: req.file.originalname,
      parents: ["root"],
    };

    const media = {
      mimeType: req.file.mimetype,
      body: fs.createReadStream(filePath),
    };

    console.log('🚀 Google Drive ga yuklash boshlandi...');
    
    const response = await drive.files.create({
      requestBody: fileMetadata,
      media: media,
      fields: "id, name, webViewLink, webContentLink",
    });

    console.log('✅ Google Drive ga yuklandi:', response.data.id);

    // Faylni ommaga ko'rsatish
    await drive.permissions.create({
      fileId: response.data.id,
      requestBody: {
        role: "reader",
        type: "anyone",
      },
    });

    // Vaqtincha faylni o'chirish
    fs.unlinkSync(filePath);

    res.status(200).json({
      message: "✅ Video Google Drive ga muvaffaqiyatli yuklandi!",
      file: response.data,
    });

  } catch (error) {
    console.error('❌ Google Drive upload xatosi:', error);
    
    // Agar Google Drive da xato bo'lsa, lokalga saqlash
    if (req.file) {
      try {
        console.log('🔄 Lokal saqlashga o\'tamiz...');
        await uploadToLocal(req, res);
      } catch (localError) {
        console.error('❌ Lokal saqlash xatosi:', localError);
        
        if (req.file && fs.existsSync(req.file.path)) {
          fs.unlinkSync(req.file.path);
        }
        
        res.status(500).json({ 
          message: "Yuklashda xatolik", 
          error: error.message 
        });
      }
    }
  }
};

// Lokal saqlash funksiyasi
async function uploadToLocal(req, res) {
  const filePath = req.file.path;

  // Public papkasini yaratish
  const publicDir = path.join(__dirname, '..', 'public', 'videos');
  if (!fs.existsSync(publicDir)) {
    fs.mkdirSync(publicDir, { recursive: true });
  }

  // Yangi fayl nomi
  const newFileName = Date.now() + '-' + req.file.originalname;
  const newFilePath = path.join(publicDir, newFileName);

  // Faylni public papkasiga ko'chirish
  fs.copyFileSync(filePath, newFilePath);
  fs.unlinkSync(filePath);

  // URL yaratish
  const videoUrl = `http://localhost:5000/videos/${newFileName}`;

  console.log('✅ Video lokalga saqlandi:', videoUrl);

  res.status(200).json({
    message: "✅ Video serverga muvaffaqiyatli yuklandi!",
    file: {
      id: newFileName,
      name: req.file.originalname,
      webViewLink: videoUrl,
      webContentLink: videoUrl,
      localPath: newFilePath
    },
  });
}

// 📋 Fayllar ro'yxati
exports.listFiles = async (req, res) => {
  try {
    // Avval Google Drive dan urinib ko'ramiz
    if (drive) {
      const response = await drive.files.list({
        pageSize: 20,
        fields: "files(id, name, mimeType, webViewLink, webContentLink, createdTime, size)",
        orderBy: "createdTime desc",
      });

      const videoFiles = response.data.files.filter(file => 
        file.mimeType && file.mimeType.startsWith('video/')
      );

      return res.status(200).json({
        message: "Google Drive'dagi video fayllar",
        files: videoFiles,
        source: "google_drive"
      });
    }
    
    // Agar Drive mavjud bo'lmasa, lokal fayllarni ko'rsatamiz
    const publicDir = path.join(__dirname, '..', 'public', 'videos');
    
    if (!fs.existsSync(publicDir)) {
      return res.status(200).json({
        message: "Hozircha video fayllar mavjud emas",
        files: [],
        source: "local"
      });
    }

    const files = fs.readdirSync(publicDir)
      .filter(file => file.match(/\.(mp4|mov|avi|mkv|webm)$/i))
      .map(file => {
        const filePath = path.join(publicDir, file);
        const stats = fs.statSync(filePath);
        
        return {
          id: file,
          name: file,
          webViewLink: `http://localhost:5000/videos/${file}`,
          webContentLink: `http://localhost:5000/videos/${file}`,
          createdTime: stats.birthtime,
          size: stats.size
        };
      });

    res.status(200).json({
      message: "Lokal video fayllar",
      files: files,
      source: "local"
    });
  } catch (error) {
    console.error("Fayllarni olishda xato:", error);
    res.status(500).json({
      message: "Fayllarni olishda xatolik",
      error: error.message,
    });
  }
};

// 🔐 OAuth URL yaratish
exports.getAuthUrl = (req, res) => {
  const authUrl = oauth2Client.generateAuthUrl({
    access_type: 'offline',
    scope: ['https://www.googleapis.com/auth/drive.file'],
    prompt: 'consent'
  });

  res.json({
    message: "Google Drive ga ulanish uchun quyidagi linkga o'ting:",
    authUrl: authUrl
  });
};

// 🔄 OAuth callback
exports.oauthCallback = async (req, res) => {
  try {
    const { code } = req.query;
    
    if (!code) {
      return res.status(400).json({ message: "Authorization code topilmadi" });
    }

    const { tokens } = await oauth2Client.getToken(code);
    oauth2Client.setCredentials(tokens);

    console.log('✅ OAuth muvaffaqiyatli:', tokens);

    // Refresh tokenni saqlash (aslida DB ga saqlash kerak)
    if (tokens.refresh_token) {
      console.log('🔄 Refresh token:', tokens.refresh_token);
      // Bu yerda refresh tokenni .env fayliga yoki DB ga saqlashingiz kerak
    }

    // Drive client ni yangilash
    drive = google.drive({
      version: "v3",
      auth: oauth2Client,
    });

    res.json({
      message: "Google Drive ga muvaffaqiyatli ulandingiz! ✅",
      tokens: {
        access_token: !!tokens.access_token,
        refresh_token: !!tokens.refresh_token,
        expiry_date: tokens.expiry_date
      }
    });
  } catch (error) {
    console.error('OAuth callback xatosi:', error);
    res.status(500).json({ 
      message: "Autentifikatsiyada xatolik", 
      error: error.message 
    });
  }
};

// Test endpoint
exports.testDrive = async (req, res) => {
  if (drive) {
    try {
      const response = await drive.files.list({
        pageSize: 1,
        fields: "files(id, name)",
      });

      res.status(200).json({
        message: "Google Drive muvaffaqiyatli ulandi! ✅",
        fileCount: response.data.files.length,
        connected: true
      });
    } catch (error) {
      res.status(500).json({
        message: "Google Drive ga ulanishda xatolik",
        error: error.message,
        connected: false
      });
    }
  } else {
    res.status(200).json({
      message: "Lokal fayl tizimi ishlamoqda! ✅",
      note: "Google Drive ga ulanish uchun OAuth kerak",
      connected: false,
      authRequired: true,
      authUrl: `http://localhost:5000/api/drive/auth-url`
    });
  }
};