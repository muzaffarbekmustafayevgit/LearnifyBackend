// controllers/lessonController.js
const Lesson = require("../models/Lesson");
const Progress = require("../models/Progress");
const Certificate = require("../models/Certificate");
const User = require("../models/User");
const { google } = require('googleapis');
const fs = require('fs');
const path = require('path');

// Google Drive sozlamalari
const oauth2Client = new google.auth.OAuth2(
  process.env.GOOGLE_CLIENT_ID,
  process.env.GOOGLE_CLIENT_SECRET,
  process.env.GOOGLE_REDIRECT_URI
);

// Token yangilash funksiyasi
const refreshAccessToken = async () => {
  try {
    const { credentials } = await oauth2Client.refreshAccessToken();
    oauth2Client.setCredentials(credentials);
    console.log('✅ Google Drive token yangilandi');
    return credentials;
  } catch (error) {
    console.error('❌ Token yangilashda xatolik:', error);
    throw error;
  }
};

oauth2Client.setCredentials({ 
  refresh_token: process.env.GOOGLE_REFRESH_TOKEN 
});

const drive = google.drive({ version: 'v3', auth: oauth2Client });

// 🎬 Video faylni Google Drive'ga yuklash funksiyasi
const uploadToGoogleDrive = async (file, folderId = null) => {
  try {
    console.log('📤 Video Google Drive\'ga yuklanmoqda...');

    const fileMetadata = {
      name: `lesson_${Date.now()}_${file.originalname}`,
      mimeType: file.mimetype,
    };

    // Agar folder ID berilgan bo'lsa
    if (folderId) {
      fileMetadata.parents = [folderId];
    }

    const media = {
      mimeType: file.mimetype,
      body: fs.createReadStream(file.path),
    };

    // Faylni Drive'ga yuklash
    const driveResponse = await drive.files.create({
      resource: fileMetadata,
      media: media,
      fields: 'id, name, webViewLink, webContentLink, mimeType, size',
    });

    // Umumiy ruxsat berish
    await drive.permissions.create({
      fileId: driveResponse.data.id,
      requestBody: {
        role: 'reader',
        type: 'anyone',
      },
    });

    console.log('✅ Video Google Drive\'ga yuklandi:', driveResponse.data.id);

    return {
      fileId: driveResponse.data.id,
      viewLink: `https://drive.google.com/file/d/${driveResponse.data.id}/view`,
      downloadLink: driveResponse.data.webContentLink,
      webViewLink: driveResponse.data.webViewLink,
      name: driveResponse.data.name,
      mimeType: driveResponse.data.mimeType,
      size: driveResponse.data.size
    };

  } catch (error) {
    console.error('❌ Google Drive yuklash xatosi:', error);
    
    // Agar authorization xatosi bo'lsa, token yangilash
    if (error.code === 401) {
      console.log('🔄 Token yangilanmoqda...');
      await refreshAccessToken();
      // Qayta urinib ko'rish
      return uploadToGoogleDrive(file, folderId);
    }
    
    throw error;
  }
};

// 🎬 Yangi video dars yaratish
exports.createLesson = async (req, res) => {
  try {
    const { title, description, courseId, moduleId, videoUrl, duration, order, isFree } = req.body;

    console.log('📥 Dars yaratish so\'rovi:', { title, courseId, moduleId });
    console.log('📁 Fayl ma\'lumotlari:', req.file ? req.file.originalname : 'Fayl yo\'q');

    // Validatsiya
    if (!title || !courseId) {
      return res.status(400).json({ 
        success: false, 
        message: "Sarlavha va kurs ID majburiy",
        required: ["title", "courseId"]
      });
    }

    // Video URL yoki fayl tekshirish
    if (!videoUrl && !req.file) {
      return res.status(400).json({ 
        success: false, 
        message: "Video URL yoki video fayl majburiy"
      });
    }

    let finalVideoUrl = videoUrl;
    let driveFileId = null;
    let fileSize = 0;
    let mimeType = 'video/mp4';

    // Agar video fayl yuklangan bo'lsa, Google Drive'ga yuklash
    if (req.file) {
      try {
        const driveResult = await uploadToGoogleDrive(req.file, process.env.GOOGLE_DRIVE_FOLDER_ID);
        
        finalVideoUrl = driveResult.viewLink;
        driveFileId = driveResult.fileId;
        fileSize = driveResult.size;
        mimeType = driveResult.mimeType;

        // Vaqtinchalik faylni o'chirish
        fs.unlinkSync(req.file.path);
        console.log('✅ Vaqtinchalik fayl o\'chirildi');

      } catch (driveError) {
        console.error('❌ Google Drive yuklash xatosi:', driveError);
        
        // Agar fayl yuklangan bo'lsa, uni o'chirish
        if (req.file && fs.existsSync(req.file.path)) {
          fs.unlinkSync(req.file.path);
        }
        
        return res.status(500).json({ 
          success: false, 
          message: "Video Google Drive'ga yuklashda xatolik",
          error: driveError.message 
        });
      }
    }

    // Yangi dars yaratish
    const lesson = new Lesson({
      title,
      description: description || "",
      course: courseId,
      module: moduleId,
      videoUrl: finalVideoUrl,
      driveFileId: driveFileId,
      duration: duration || 0,
      fileSize: fileSize,
      mimeType: mimeType,
      order: order || 0,
      isFree: isFree || false,
      teacher: req.user.id,
      type: "video",
      status: "published"
    });

    await lesson.save();

    console.log('✅ Dars yaratildi:', lesson._id);

    // Response
    const responseData = {
      success: true,
      message: "Video dars muvaffaqiyatli yaratildi",
      data: lesson
    };

    // Agar Drive'ga yuklangan bo'lsa, qo'shimcha ma'lumot qo'shish
    if (driveFileId) {
      responseData.driveInfo = {
        fileId: driveFileId,
        message: "Video Google Drive'ga muvaffaqiyatli yuklandi"
      };
    }

    res.status(201).json(responseData);

  } catch (err) {
    console.error("❌ Dars yaratishda xatolik:", err);
    
    // Agar fayl yuklangan bo'lsa va xatolik yuz bersa, uni o'chirish
    if (req.file && fs.existsSync(req.file.path)) {
      fs.unlinkSync(req.file.path);
    }
    
    res.status(500).json({ 
      success: false, 
      message: err.message 
    });
  }
};

// 📚 Kurs bo'yicha barcha darslarni olish
exports.getLessonsByCourse = async (req, res) => {
  try {
    const { courseId } = req.params;
    const { page = 1, limit = 10, status, isFree } = req.query;

    console.log(`📚 Kurs darslari olinmoqda: ${courseId}`);

    // Filter object
    const filter = { 
      course: courseId, 
      isDeleted: false 
    };

    // Qo'shimcha filtrlarni qo'shish
    if (status) filter.status = status;
    if (isFree !== undefined) filter.isFree = isFree === 'true';

    const lessons = await Lesson.find(filter)
      .sort({ order: 1, createdAt: -1 })
      .populate('module', 'title order')
      .populate('teacher', 'firstName lastName avatar')
      .limit(limit * 1)
      .skip((page - 1) * limit);

    const total = await Lesson.countDocuments(filter);

    res.status(200).json({ 
      success: true, 
      data: lessons,
      pagination: {
        current: page,
        pages: Math.ceil(total / limit),
        total,
        limit
      }
    });
  } catch (err) {
    console.error("❌ Kurs darslarini olishda xatolik:", err);
    res.status(500).json({ 
      success: false, 
      message: "Darslarni olishda xatolik", 
      error: err.message 
    });
  }
};

// 🎥 Bitta darsni olish
exports.getLessonById = async (req, res) => {
  try {
    const { id } = req.params;

    console.log(`🎥 Dars ma'lumotlari olinmoqda: ${id}`);

    const lesson = await Lesson.findById(id)
      .populate('module', 'title order')
      .populate('course', 'title description')
      .populate('teacher', 'firstName lastName avatar bio');

    if (!lesson) {
      return res.status(404).json({ 
        success: false, 
        message: "Dars topilmadi" 
      });
    }

    // Ko'rishlar sonini oshirish
    lesson.viewCount += 1;
    await lesson.save();

    res.status(200).json({ 
      success: true, 
      data: lesson 
    });
  } catch (err) {
    console.error("❌ Dars ma'lumotlarini olishda xatolik:", err);
    res.status(500).json({ 
      success: false, 
      message: "Xatolik", 
      error: err.message 
    });
  }
};

// ✏️ Darsni yangilash
exports.updateLesson = async (req, res) => {
  try {
    const { id } = req.params;
    const { title, description, videoUrl, duration, order, isFree, status } = req.body;

    console.log(`✏️ Dars yangilanmoqda: ${id}`);

    const lesson = await Lesson.findById(id);
    if (!lesson) {
      return res.status(404).json({ 
        success: false, 
        message: "Dars topilmadi" 
      });
    }

    // Teacher tekshirish
    if (lesson.teacher.toString() !== req.user.id && req.user.role !== "admin") {
      return res.status(403).json({ 
        success: false, 
        message: "Ruxsatingiz yo'q" 
      });
    }

    let finalVideoUrl = videoUrl;
    let newDriveFileId = null;
    let fileSize = lesson.fileSize;
    let mimeType = lesson.mimeType;

    // Agar yangi video fayl yuklangan bo'lsa
    if (req.file) {
      try {
        // Eski videoni Drive'dan o'chirish
        if (lesson.driveFileId) {
          try {
            await drive.files.delete({
              fileId: lesson.driveFileId
            });
            console.log('🗑️ Eski video o\'chirildi:', lesson.driveFileId);
          } catch (deleteError) {
            console.error('❌ Eski videoni o\'chirishda xatolik:', deleteError.message);
          }
        }

        // Yangi videoni yuklash
        const driveResult = await uploadToGoogleDrive(req.file, process.env.GOOGLE_DRIVE_FOLDER_ID);
        
        finalVideoUrl = driveResult.viewLink;
        newDriveFileId = driveResult.fileId;
        fileSize = driveResult.size;
        mimeType = driveResult.mimeType;

        fs.unlinkSync(req.file.path);
        console.log('✅ Yangi video yuklandi:', driveResult.fileId);

      } catch (driveError) {
        console.error('❌ Yangi video yuklash xatosi:', driveError);
        
        if (req.file && fs.existsSync(req.file.path)) {
          fs.unlinkSync(req.file.path);
        }
        
        return res.status(500).json({ 
          success: false, 
          message: "Yangi videoni yuklashda xatolik",
          error: driveError.message 
        });
      }
    }

    // Yangilash
    lesson.title = title || lesson.title;
    lesson.description = description || lesson.description;
    
    // Agar yangi video URL berilgan bo'lsa
    if (finalVideoUrl) {
      lesson.videoUrl = finalVideoUrl;
      lesson.driveFileId = newDriveFileId;
      lesson.fileSize = fileSize;
      lesson.mimeType = mimeType;
    }
    
    lesson.duration = duration || lesson.duration;
    lesson.order = order || lesson.order;
    lesson.isFree = isFree ?? lesson.isFree;
    lesson.status = status || lesson.status;
    lesson.updatedAt = Date.now();

    await lesson.save();
    
    res.status(200).json({ 
      success: true, 
      message: "Video dars yangilandi", 
      data: lesson 
    });
  } catch (err) {
    console.error("❌ Darsni yangilashda xatolik:", err);
    
    if (req.file && fs.existsSync(req.file.path)) {
      fs.unlinkSync(req.file.path);
    }
    
    res.status(500).json({ 
      success: false, 
      message: err.message 
    });
  }
};

// 🗑️ Darsni o'chirish (soft delete)
exports.deleteLesson = async (req, res) => {
  try {
    const { id } = req.params;

    console.log(`🗑️ Dars o'chirilmoqda: ${id}`);

    const lesson = await Lesson.findById(id);
    if (!lesson) {
      return res.status(404).json({ 
        success: false, 
        message: "Dars topilmadi" 
      });
    }

    if (lesson.teacher.toString() !== req.user.id && req.user.role !== "admin") {
      return res.status(403).json({ 
        success: false, 
        message: "Ruxsatingiz yo'q" 
      });
    }

    // Agar Drive fayli bo'lsa, uni o'chirish
    if (lesson.driveFileId) {
      try {
        await drive.files.delete({
          fileId: lesson.driveFileId
        });
        console.log('🗑️ Google Drive fayli o\'chirildi:', lesson.driveFileId);
      } catch (driveError) {
        console.error('❌ Google Drive faylini o\'chirishda xatolik:', driveError.message);
      }
    }

    lesson.isDeleted = true;
    lesson.status = 'archived';
    await lesson.save();

    res.status(200).json({ 
      success: true, 
      message: "Dars va uning videosi o'chirildi" 
    });
  } catch (err) {
    console.error("❌ Darsni o'chirishda xatolik:", err);
    res.status(500).json({ 
      success: false, 
      message: "Darsni o'chirishda xatolik", 
      error: err.message 
    });
  }
};

// ✅ Darsni tugallash
exports.completeLesson = async (req, res) => {
  try {
    const { courseId, lessonId } = req.body;
    const studentId = req.user.id;

    console.log(`✅ Dars tugallanmoqda: ${lessonId}, Student: ${studentId}`);

    // Dars mavjudligini tekshirish
    const lesson = await Lesson.findById(lessonId);
    if (!lesson) {
      return res.status(404).json({ 
        success: false, 
        message: "Dars topilmadi" 
      });
    }

    let progress = await Progress.findOne({ student: studentId, course: courseId });
    if (!progress) {
      progress = new Progress({ 
        student: studentId, 
        course: courseId, 
        completedLessons: [] 
      });
    }

    // Agar dars avval tugallanmagan bo'lsa
    if (!progress.completedLessons.includes(lessonId)) {
      progress.completedLessons.push(lessonId);
      
      // Dars tugallanganlar sonini oshirish
      lesson.completionCount += 1;
      await lesson.save();
    }

    // Progressni hisoblash
    const totalLessons = await Lesson.countDocuments({ 
      course: courseId, 
      isDeleted: false,
      status: 'published'
    });
    
    progress.progress = Math.round((progress.completedLessons.length / totalLessons) * 100);

    // User ballarini oshirish
    const user = await User.findById(studentId);
    user.points += 10;

    // Rank yangilash
    if (user.points >= 200) user.rank = "Intermediate";
    if (user.points >= 500) user.rank = "Pro";

    await user.save();

    // Sertifikat tekshirish (70% progress)
    if (progress.progress >= 70) {
      const certExists = await Certificate.findOne({ 
        student: studentId, 
        course: courseId 
      });
      if (!certExists) {
        await Certificate.create({
          student: studentId,
          course: courseId,
          filePath: `certificates/${studentId}_${courseId}.pdf`,
          issuedAt: new Date()
        });
        console.log('📜 Sertifikat yaratildi:', { studentId, courseId });
      }
    }

    await progress.save();

    res.status(200).json({ 
      success: true, 
      message: "Dars muvaffaqiyatli tugallandi",
      data: {
        progress,
        pointsAdded: 10,
        newRank: user.rank
      }
    });
  } catch (error) {
    console.error("❌ Darsni tugallashda xatolik:", error);
    res.status(500).json({ 
      success: false, 
      message: "Progressni yangilashda xatolik", 
      error: error.message 
    });
  }
};

// 📂 Modul bo'yicha darslarni olish
exports.getLessonsByModule = async (req, res) => {
  try {
    const { moduleId } = req.params;
    const { page = 1, limit = 10 } = req.query;

    console.log(`📂 Modul darslari olinmoqda: ${moduleId}`);

    const lessons = await Lesson.find({ 
      module: moduleId,
      isDeleted: false,
      status: 'published'
    })
    .sort({ order: 1, createdAt: -1 })
    .populate('teacher', 'firstName lastName avatar')
    .limit(limit * 1)
    .skip((page - 1) * limit);

    const total = await Lesson.countDocuments({ 
      module: moduleId, 
      isDeleted: false,
      status: 'published'
    });

    res.status(200).json({ 
      success: true, 
      data: lessons,
      pagination: {
        current: page,
        pages: Math.ceil(total / limit),
        total,
        limit
      }
    });
  } catch (error) {
    console.error("❌ Modul darslarini olishda xatolik:", error);
    res.status(500).json({ 
      success: false, 
      message: error.message 
    });
  }
};

// 🔍 Darslarni qidirish
exports.searchLessons = async (req, res) => {
  try {
    const { q, courseId, moduleId, status, isFree } = req.query;
    const { page = 1, limit = 10 } = req.query;

    console.log(`🔍 Darslar qidirilmoqda: ${q}`);

    const filter = { 
      isDeleted: false,
      status: 'published'
    };

    // Qidiruv so'zi
    if (q) {
      filter.$or = [
        { title: { $regex: q, $options: 'i' } },
        { description: { $regex: q, $options: 'i' } }
      ];
    }

    // Qo'shimcha filtrlarni qo'shish
    if (courseId) filter.course = courseId;
    if (moduleId) filter.module = moduleId;
    if (isFree !== undefined) filter.isFree = isFree === 'true';

    const lessons = await Lesson.find(filter)
      .sort({ createdAt: -1 })
      .populate('course', 'title')
      .populate('module', 'title')
      .populate('teacher', 'firstName lastName')
      .limit(limit * 1)
      .skip((page - 1) * limit);

    const total = await Lesson.countDocuments(filter);

    res.status(200).json({ 
      success: true, 
      data: lessons,
      pagination: {
        current: page,
        pages: Math.ceil(total / limit),
        total,
        limit
      }
    });
  } catch (error) {
    console.error("❌ Darslarni qidirishda xatolik:", error);
    res.status(500).json({ 
      success: false, 
      message: "Qidiruvda xatolik", 
      error: error.message 
    });
  }
};

// 📊 Dars statistikasi
exports.getLessonStats = async (req, res) => {
  try {
    const { id } = req.params;

    const lesson = await Lesson.findById(id);
    if (!lesson) {
      return res.status(404).json({ 
        success: false, 
        message: "Dars topilmadi" 
      });
    }

    // Progress ma'lumotlari
    const completionCount = await Progress.countDocuments({
      completedLessons: id
    });

    // Kursdagi barcha studentlar soni
    const totalStudents = await Progress.countDocuments({
      course: lesson.course
    });

    const stats = {
      viewCount: lesson.viewCount,
      completionCount: lesson.completionCount,
      completionRate: totalStudents > 0 ? (completionCount / totalStudents * 100).toFixed(2) : 0,
      averageRating: 0, // Agar rating tizimi bo'lsa
      totalStudents,
      studentsCompleted: completionCount
    };

    res.status(200).json({ 
      success: true, 
      data: stats 
    });
  } catch (error) {
    console.error("❌ Statistikani olishda xatolik:", error);
    res.status(500).json({ 
      success: false, 
      message: "Statistikani olishda xatolik", 
      error: error.message 
    });
  }
};