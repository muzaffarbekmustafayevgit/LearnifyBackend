// controllers/lessonController.js
const Lesson = require("../models/Lesson");
const Progress = require("../models/Progress");
const Certificate = require("../models/Certificate");
const User = require("../models/User");
const fs = require('fs');
const path = require('path');


const ensureUploadsDir = () => {
  const uploadsDir = path.join(__dirname, '..', 'uploads');
  const videosDir = path.join(uploadsDir, 'videos');
  
  if (!fs.existsSync(uploadsDir)) {
    fs.mkdirSync(uploadsDir, { recursive: true });
    console.log('✅ Uploads papkasi yaratildi:', uploadsDir);
  }
  
  if (!fs.existsSync(videosDir)) {
    fs.mkdirSync(videosDir, { recursive: true });
    console.log('✅ Videos papkasi yaratildi:', videosDir);
  }
  
  return videosDir;
};

// 🎬 Video faylni local saqlash funksiyasi
const saveVideoLocally = async (file) => {
  if (!file) {
    throw new Error("Fayl uzatilmadi (file undefined)");
  }

  console.log('📤 Video local fayl sifatida saqlanmoqda...');

  const videosDir = ensureUploadsDir();

  const originalName = path.parse(file.originalname).name;
  const extension = path.extname(file.originalname);

  const safeName = originalName
    .replace(/[^\w\s-]/g, '')
    .replace(/\s+/g, '_')
    .toLowerCase();

  const fileName = `lesson_${Date.now()}_${safeName}${extension}`;
  const filePath = path.join(videosDir, fileName);

  fs.copyFileSync(file.path, filePath);

  return {
    fileName,
    filePath,
    url: `/uploads/videos/${fileName}`,
    name: file.originalname,
    mimeType: file.mimetype,
    size: file.size
  };
};



// 🗑️ Local faylni o'chirish
const deleteLocalFile = async (filePath) => {
  try {
    if (!filePath) return;

    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
      console.log('🗑️ Local fayl o\'chirildi:', filePath);
    }
    
    return true;
  } catch (error) {
    console.error('❌ Local faylni ochirishda xatolik:', error.message);
    return false;
  }
};

// 🎬 Yangi video dars yaratish
exports.createLesson = async (req, res) => {
  let tempFileCleaned = false;
  
  try {
    const { title, description, courseId, moduleId, videoUrl, duration, order, isFree } = req.body;

    console.log('📥 Dars yaratish so\'rovi:', { title, courseId, moduleId });
    console.log('📁 Fayl ma\'lumotlari:', req.file ? {
      originalname: req.file.originalname,
      size: (req.file.size / (1024 * 1024)).toFixed(2) + ' MB',
      mimetype: req.file.mimetype
    } : 'Fayl yo\'q');

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

    // Video formatlari validatsiyasi
    const allowedMimeTypes = [
      'video/mp4', 'video/mkv', 'video/avi', 'video/mov', 'video/webm',
      'video/x-msvideo', 'video/quicktime', 'video/x-matroska'
    ];
    
    const maxFileSize = 75 * 1024 * 1024; // 75MB - Sizning talabingiz

    if (req.file) {
      if (!allowedMimeTypes.includes(req.file.mimetype)) {
        // Vaqtinchalik faylni o'chirish
        fs.unlinkSync(req.file.path);
        tempFileCleaned = true;
        
        return res.status(400).json({
          success: false,
          message: "Faqat video fayllar qabul qilinadi (MP4, MKV, AVI, MOV, WEBM)",
          allowedTypes: allowedMimeTypes,
          receivedType: req.file.mimetype
        });
      }
      
      if (req.file.size > maxFileSize) {
        // Vaqtinchalik faylni o'chirish
        fs.unlinkSync(req.file.path);
        tempFileCleaned = true;
        
        return res.status(400).json({
          success: false,
          message: "Video hajmi 75MB dan oshmasligi kerak",
          maxSize: "75MB",
          receivedSize: (req.file.size / (1024 * 1024)).toFixed(2) + " MB"
        });
      }
    }

    let finalVideoUrl = videoUrl;
    let localFilePath = null;
    let fileName = null;
    let fileSize = 0;
    let mimeType = 'video/mp4';
    let publicUrl = null;

    // Agar video fayl yuklangan bo'lsa, local saqlash
    if (req.file) {
      try {
        const localResult = await saveVideoLocally(req.file);
        
        finalVideoUrl = localResult.url;
        localFilePath = localResult.filePath;
        fileName = localResult.fileName;
        fileSize = localResult.size;
        mimeType = localResult.mimeType;
        publicUrl = `${req.protocol}://${req.get('host')}${localResult.url}`;

        // Vaqtinchalik faylni o'chirish
        if (fs.existsSync(req.file.path)) {
          fs.unlinkSync(req.file.path);
          tempFileCleaned = true;
        }
        console.log('✅ Vaqtinchalik fayl o\'chirildi');

      } catch (localError) {
        console.error('❌ Local fayl saqlash xatosi:', localError);
        
        // Agar fayl yuklangan bo'lsa, uni o'chirish
        if (req.file && fs.existsSync(req.file.path) && !tempFileCleaned) {
          fs.unlinkSync(req.file.path);
          tempFileCleaned = true;
        }
        
        return res.status(500).json({ 
          success: false, 
          message: "Video faylni saqlashda xatolik",
          error: localError.message 
        });
      }
    }

    // Order ni avtomatik hisoblash agar berilmagan bo'lsa
    let finalOrder = order;
    if (!finalOrder && finalOrder !== 0) {
      const lastLesson = await Lesson.findOne({ 
        course: courseId,
        module: moduleId 
      }).sort({ order: -1 });
      
      finalOrder = lastLesson ? lastLesson.order + 1 : 0;
    }

    // Yangi dars yaratish
    const lesson = new Lesson({
      title: title.trim(),
      description: (description || "").trim(),
      course: courseId,
      module: moduleId,
      videoUrl: finalVideoUrl,
      videoPublicUrl: publicUrl || finalVideoUrl,
      localFilePath: localFilePath,
      fileName: fileName,
      duration: duration || 0,
      fileSize: fileSize,
      mimeType: mimeType,
      order: finalOrder,
      isFree: isFree || false,
      teacher: req.user.id,
      type: "video",
      status: "published"
    });

    await lesson.save();
    
    // Populate qilish
    await lesson.populate('module', 'title order');
    await lesson.populate('teacher', 'firstName lastName avatar');
    await lesson.populate('course', 'title');

    console.log('✅ Dars yaratildi:', lesson._id);

    // Response
    const responseData = {
      success: true,
      message: "Video dars muvaffaqiyatli yaratildi",
      data: lesson
    };

    res.status(201).json(responseData);

  } catch (err) {
    console.error("❌ Dars yaratishda xatolik:", err);
    
    // Agar fayl yuklangan bo'lsa va xatolik yuz bersa, uni o'chirish
    if (req.file && fs.existsSync(req.file.path) && !tempFileCleaned) {
      fs.unlinkSync(req.file.path);
    }
    
    res.status(500).json({ 
      success: false, 
      message: err.message || "Dars yaratishda xatolik"
    });
  }
};
// 📚 Kurs bo'yicha barcha darslarni olish
exports.getLessonsByCourse = async (req, res) => {
  try {
    const { courseId } = req.params;
    const { page = 1, limit = 10, status, isFree, sortBy = 'order', sortOrder = 'asc' } = req.query;

    console.log(`📚 Kurs darslari olinmoqda: ${courseId}`);

    // Sort sozlamalari
    const sortOptions = {};
    sortOptions[sortBy] = sortOrder === 'desc' ? -1 : 1;

    // Filter object
    const filter = { 
      course: courseId, 
      isDeleted: false 
    };

    // Qo'shimcha filtrlarni qo'shish
    if (status) filter.status = status;
    if (isFree !== undefined) filter.isFree = isFree === 'true';

    const lessons = await Lesson.find(filter)
      .sort(sortOptions)
      .populate('module', 'title order')
      .populate('teacher', 'firstName lastName avatar')
      .limit(limit * 1)
      .skip((page - 1) * limit)
      .lean();

    // Video URL larni to'liq URL ga o'zgartirish
    lessons.forEach(lesson => {
      if (lesson.videoUrl && lesson.videoUrl.startsWith('/uploads/')) {
        lesson.videoUrl = `${req.protocol}://${req.get('host')}${lesson.videoUrl}`;
      }
    });

    const total = await Lesson.countDocuments(filter);

    // Progress ma'lumotlarini qo'shish (agar student bo'lsa)
    if (req.user.role === 'student') {
      const progress = await Progress.findOne({
        student: req.user.id,
        course: courseId
      });

      if (progress) {
        lessons.forEach(lesson => {
          lesson.isCompleted = progress.completedLessons.includes(lesson._id.toString());
        });
      }
    }

    res.status(200).json({ 
      success: true, 
      data: lessons,
      pagination: {
        current: parseInt(page),
        pages: Math.ceil(total / limit),
        total,
        limit: parseInt(limit)
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

    const lesson = await Lesson.findOne({
      _id: id,
      isDeleted: false
    })
      .populate('module', 'title order')
      .populate('course', 'title description')
      .populate('teacher', 'firstName lastName avatar bio');

    if (!lesson) {
      return res.status(404).json({ 
        success: false, 
        message: "Dars topilmadi" 
      });
    }

    // Agar video local saqlangan bo'lsa, to'liq URL ni qo'shish
    if (lesson.videoUrl && lesson.videoUrl.startsWith('/uploads/')) {
      lesson.videoUrl = `${req.protocol}://${req.get('host')}${lesson.videoUrl}`;
    }

    // Student uchun progress ma'lumotlari
    let userProgress = null;
    if (req.user.role === 'student') {
      const progress = await Progress.findOne({
        student: req.user.id,
        course: lesson.course
      });

      if (progress) {
        userProgress = {
          isCompleted: progress.completedLessons.includes(lesson._id.toString()),
          progressPercentage: progress.progress,
          completedLessons: progress.completedLessons.length
        };
      }
    }

    // Ko'rishlar sonini oshirish
    lesson.viewCount += 1;
    await lesson.save();

    const responseData = {
      success: true, 
      data: lesson
    };

    if (userProgress) {
      responseData.userProgress = userProgress;
    }

    res.status(200).json(responseData);
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
  let tempFileCleaned = false;
  
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

    // Video formatlari validatsiyasi
    const allowedMimeTypes = [
      'video/mp4', 'video/mkv', 'video/avi', 'video/mov', 'video/webm',
      'video/x-msvideo', 'video/quicktime', 'video/x-matroska'
    ];
    
    const maxFileSize = 75 * 1024 * 1024; // 75MB - Sizning talabingiz

    if (req.file) {
      if (!allowedMimeTypes.includes(req.file.mimetype)) {
        fs.unlinkSync(req.file.path);
        tempFileCleaned = true;
        
        return res.status(400).json({
          success: false,
          message: "Faqat video fayllar qabul qilinadi (MP4, MKV, AVI, MOV, WEBM)"
        });
      }
      
      if (req.file.size > maxFileSize) {
        fs.unlinkSync(req.file.path);
        tempFileCleaned = true;
        
        return res.status(400).json({
          success: false,
          message: "Video hajmi 75MB dan oshmasligi kerak"
        });
      }
    }

    let finalVideoUrl = videoUrl;
    let newLocalFilePath = null;
    let newFileName = null;
    let fileSize = lesson.fileSize;
    let mimeType = lesson.mimeType;
    let publicUrl = lesson.videoPublicUrl;

    // Agar yangi video fayl yuklangan bo'lsa
    if (req.file) {
      try {
        // Eski videoni o'chirish
        if (lesson.localFilePath) {
          await deleteLocalFile(lesson.localFilePath);
        }

        // Yangi videoni saqlash
        const localResult = await saveVideoLocally(req.file);
        
        finalVideoUrl = localResult.url;
        newLocalFilePath = localResult.filePath;
        newFileName = localResult.fileName;
        fileSize = localResult.size;
        mimeType = localResult.mimeType;
        publicUrl = `${req.protocol}://${req.get('host')}${localResult.url}`;

        if (fs.existsSync(req.file.path)) {
          fs.unlinkSync(req.file.path);
          tempFileCleaned = true;
        }
        console.log('✅ Yangi video saqlandi:', localResult.fileName);

      } catch (localError) {
        console.error('❌ Yangi video saqlash xatosi:', localError);
        
        if (req.file && fs.existsSync(req.file.path) && !tempFileCleaned) {
          fs.unlinkSync(req.file.path);
          tempFileCleaned = true;
        }
        
        return res.status(500).json({ 
          success: false, 
          message: "Yangi videoni saqlashda xatolik",
          error: localError.message 
        });
      }
    }

    // Yangilash ma'lumotlari
    const updateData = {
      ...(title && { title: title.trim() }),
      ...(description && { description: description.trim() }),
      ...(duration !== undefined && { duration }),
      ...(order !== undefined && { order }),
      ...(isFree !== undefined && { isFree }),
      ...(status && { status }),
      updatedAt: Date.now()
    };

    // Agar yangi video URL berilgan bo'lsa
    if (finalVideoUrl) {
      updateData.videoUrl = finalVideoUrl;
      updateData.videoPublicUrl = publicUrl;
      updateData.localFilePath = newLocalFilePath;
      updateData.fileName = newFileName;
      updateData.fileSize = fileSize;
      updateData.mimeType = mimeType;
    }

    const updatedLesson = await Lesson.findByIdAndUpdate(
      id, 
      updateData, 
      { new: true, runValidators: true }
    ).populate('module', 'title order')
     .populate('teacher', 'firstName lastName avatar')
     .populate('course', 'title');
    
    // Agar video local saqlangan bo'lsa, to'liq URL ni qo'shish
    if (updatedLesson.videoUrl && updatedLesson.videoUrl.startsWith('/uploads/')) {
      updatedLesson.videoUrl = `${req.protocol}://${req.get('host')}${updatedLesson.videoUrl}`;
    }
    
    res.status(200).json({ 
      success: true, 
      message: "Video dars yangilandi", 
      data: updatedLesson 
    });
  } catch (err) {
    console.error("❌ Darsni yangilashda xatolik:", err);
    
    if (req.file && fs.existsSync(req.file.path) && !tempFileCleaned) {
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

    // Agar local fayl bo'lsa, uni o'chirish
    if (lesson.localFilePath) {
      await deleteLocalFile(lesson.localFilePath);
    }

    // Soft delete
    lesson.isDeleted = true;
    lesson.status = 'archived';
    lesson.deletedAt = new Date();
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
    const lesson = await Lesson.findOne({
      _id: lessonId,
      isDeleted: false,
      status: 'published'
    });
    
    if (!lesson) {
      return res.status(404).json({ 
        success: false, 
        message: "Dars topilmadi yoki mavjud emas" 
      });
    }

    let progress = await Progress.findOne({ 
      student: studentId, 
      course: courseId 
    });
    
    if (!progress) {
      progress = new Progress({ 
        student: studentId, 
        course: courseId, 
        completedLessons: [] 
      });
    }

    let pointsAdded = 0;
    let isNewCompletion = false;

    // Agar dars avval tugallanmagan bo'lsa
    if (!progress.completedLessons.includes(lessonId)) {
      progress.completedLessons.push(lessonId);
      isNewCompletion = true;
      
      // Dars tugallanganlar sonini oshirish
      lesson.completionCount += 1;
      await lesson.save();

      // Ball qo'shish
      pointsAdded = 10;
    }

    // Progressni hisoblash
    const totalLessons = await Lesson.countDocuments({ 
      course: courseId, 
      isDeleted: false,
      status: 'published'
    });
    
    progress.progress = totalLessons > 0 ? 
      Math.round((progress.completedLessons.length / totalLessons) * 100) : 0;

    let user = null;
    // Faqat yangi tugallangan bo'lsa ball qo'shish
    if (isNewCompletion && pointsAdded > 0) {
      user = await User.findById(studentId);
      if (user) {
        user.points += pointsAdded;

        // Rank yangilash
        if (user.points >= 500) {
          user.rank = "Pro";
        } else if (user.points >= 200) {
          user.rank = "Intermediate";
        } else if (user.points >= 50) {
          user.rank = "Beginner";
        }

        await user.save();
      }
    }

    // Sertifikat tekshirish (70% progress)
    let certificateCreated = false;
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
        certificateCreated = true;
        console.log('📜 Sertifikat yaratildi:', { studentId, courseId });
      }
    }

    await progress.save();

    const responseData = { 
      success: true, 
      message: isNewCompletion ? "Dars muvaffaqiyatli tugallandi" : "Dars avval tugallangan",
      data: {
        progress,
        isNewCompletion,
        completionRate: progress.progress,
        totalLessons,
        completedLessons: progress.completedLessons.length
      }
    };

    // Faqat yangi tugallangan bo'lsa rewards qo'shish
    if (isNewCompletion) {
      responseData.data.rewards = {
        pointsAdded,
        newRank: user?.rank,
        certificateCreated
      };
    }

    res.status(200).json(responseData);
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
    const { page = 1, limit = 10, status = 'published' } = req.query;

    console.log(`📂 Modul darslari olinmoqda: ${moduleId}`);

    const filter = { 
      module: moduleId,
      isDeleted: false
    };

    if (status) filter.status = status;

    const lessons = await Lesson.find(filter)
      .sort({ order: 1, createdAt: -1 })
      .populate('teacher', 'firstName lastName avatar')
      .populate('course', 'title')
      .limit(limit * 1)
      .skip((page - 1) * limit)
      .lean();

    const total = await Lesson.countDocuments(filter);

    res.status(200).json({ 
      success: true, 
      data: lessons,
      pagination: {
        current: parseInt(page),
        pages: Math.ceil(total / limit),
        total,
        limit: parseInt(limit)
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

// 🔍 Darslarni qidirush
exports.searchLessons = async (req, res) => {
  try {
    const { q, courseId, moduleId, status, isFree, teacherId } = req.query;
    const { page = 1, limit = 10, sortBy = 'createdAt', sortOrder = 'desc' } = req.query;

    console.log(`🔍 Darslar qidirilmoqda: ${q}`);

    const filter = { 
      isDeleted: false
    };

    // Status filter
    if (status) {
      filter.status = status;
    } else {
      filter.status = 'published'; // Default holat
    }

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
    if (teacherId) filter.teacher = teacherId;
    if (isFree !== undefined) filter.isFree = isFree === 'true';

    // Sort sozlamalari
    const sortOptions = {};
    sortOptions[sortBy] = sortOrder === 'desc' ? -1 : 1;

    const lessons = await Lesson.find(filter)
      .sort(sortOptions)
      .populate('course', 'title')
      .populate('module', 'title')
      .populate('teacher', 'firstName lastName avatar')
      .limit(limit * 1)
      .skip((page - 1) * limit)
      .lean();

    const total = await Lesson.countDocuments(filter);

    res.status(200).json({ 
      success: true, 
      data: lessons,
      pagination: {
        current: parseInt(page),
        pages: Math.ceil(total / limit),
        total,
        limit: parseInt(limit)
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
    const totalStudents = await Progress.distinct('student', {
      course: lesson.course
    });

    const totalStudentsCount = totalStudents.length;

    // O'rtacha progress
    const averageProgress = await Progress.aggregate([
      {
        $match: {
          course: lesson.course._id
        }
      },
      {
        $group: {
          _id: null,
          averageProgress: { $avg: '$progress' }
        }
      }
    ]);

    const stats = {
      basic: {
        viewCount: lesson.viewCount,
        completionCount: lesson.completionCount,
        duration: lesson.duration,
        fileSize: lesson.fileSize,
        createdAt: lesson.createdAt
      },
      completion: {
        studentsCompleted: completionCount,
        totalStudents: totalStudentsCount,
        completionRate: totalStudentsCount > 0 ? 
          ((completionCount / totalStudentsCount) * 100).toFixed(2) + '%' : '0%',
        averageCourseProgress: averageProgress[0] ? 
          Math.round(averageProgress[0].averageProgress) + '%' : '0%'
      },
      popularity: {
        level: lesson.viewCount > 100 ? 'High' : lesson.viewCount > 50 ? 'Medium' : 'Low',
        score: lesson.viewCount + (completionCount * 2)
      }
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

// 🔄 Darsni qayta faollashtirish
exports.restoreLesson = async (req, res) => {
  try {
    const { id } = req.params;

    console.log(`🔄 Dars qayta faollashtirilmoqda: ${id}`);

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

    lesson.isDeleted = false;
    lesson.status = 'published';
    lesson.deletedAt = null;
    await lesson.save();

    res.status(200).json({ 
      success: true, 
      message: "Dars qayta faollashtirildi",
      data: lesson
    });
  } catch (error) {
    console.error("❌ Darsni qayta faollashtirishda xatolik:", error);
    res.status(500).json({ 
      success: false, 
      message: "Darsni qayta faollashtirishda xatolik", 
      error: error.message 
    });
  }
};

// 📈 O'qituvchi darslari statistikasi
exports.getTeacherLessonStats = async (req, res) => {
  try {
    const teacherId = req.user.id;

    const stats = await Lesson.aggregate([
      {
        $match: {
          teacher: teacherId,
          isDeleted: false
        }
      },
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 },
          totalViews: { $sum: '$viewCount' },
          totalCompletions: { $sum: '$completionCount' },
          averageDuration: { $avg: '$duration' }
        }
      }
    ]);

    const totalLessons = await Lesson.countDocuments({
      teacher: teacherId,
      isDeleted: false
    });

    const totalViews = await Lesson.aggregate([
      {
        $match: {
          teacher: teacherId,
          isDeleted: false
        }
      },
      {
        $group: {
          _id: null,
          total: { $sum: '$viewCount' }
        }
      }
    ]);

    // Popular darslar
    const popularLessons = await Lesson.find({
      teacher: teacherId,
      isDeleted: false
    })
      .sort({ viewCount: -1 })
      .limit(5)
      .select('title viewCount completionCount')
      .lean();

    res.status(200).json({ 
      success: true, 
      data: {
        summary: {
          totalLessons,
          totalViews: totalViews[0]?.total || 0,
          popularLessons
        },
        byStatus: stats
      }
    });
  } catch (error) {
    console.error("❌ O'qituvchi statistikasini olishda xatolik:", error);
    res.status(500).json({ 
      success: false, 
      message: "Statistikani olishda xatolik", 
      error: error.message 
    });
  }
};

// 🎯 Darsni ko'rib chiqish (preview)
exports.previewLesson = async (req, res) => {
  try {
    const { id } = req.params;

    const lesson = await Lesson.findOne({
      _id: id,
      isDeleted: false,
      status: 'published'
    }).select('title description videoUrl duration teacher course')
      .populate('teacher', 'firstName lastName avatar')
      .populate('course', 'title');

    if (!lesson) {
      return res.status(404).json({ 
        success: false, 
        message: "Dars topilmadi" 
      });
    }

    // Faqat ma'lumotlarni ko'rsatish, progress o'zgartirmaslik
    res.status(200).json({ 
      success: true, 
      data: lesson 
    });
  } catch (error) {
    console.error("❌ Darsni ko'rib chiqishda xatolik:", error);
    res.status(500).json({ 
      success: false, 
      message: "Darsni ko'rib chiqishda xatolik", 
      error: error.message 
    });
  }
};

exports.uploadVideoOnly = async (req, res) => {
  let tempFileCleaned = false;
  
  try {
    console.log('📤 Faqat video yuklanmoqda...');

    if (!req.file) {
      return res.status(400).json({ 
        success: false, 
        message: "Video fayli yuklanmadi" 
      });
    }

    // Video formatlari validatsiyasi
    const allowedMimeTypes = [
      'video/mp4', 'video/mkv', 'video/avi', 'video/mov', 'video/webm',
      'video/x-msvideo', 'video/quicktime', 'video/x-matroska'
    ];
    
    const maxFileSize = 75 * 1024 * 1024; // 75MB - Sizning talabingiz

    if (!allowedMimeTypes.includes(req.file.mimetype)) {
      fs.unlinkSync(req.file.path);
      tempFileCleaned = true;
      
      return res.status(400).json({
        success: false,
        message: "Faqat video fayllar qabul qilinadi (MP4, MKV, AVI, MOV, WEBM)",
        allowedTypes: allowedMimeTypes,
        receivedType: req.file.mimetype
      });
    }
    
    if (req.file.size > maxFileSize) {
      fs.unlinkSync(req.file.path);
      tempFileCleaned = true;
      
      return res.status(400).json({
        success: false,
        message: "Video hajmi 75MB dan oshmasligi kerak",
        maxSize: "75MB",
        receivedSize: (req.file.size / (1024 * 1024)).toFixed(2) + " MB"
      });
    }

    // Uploads papkasini tekshirish
    ensureUploadsDir();
    
    // Video ni local saqlash
    const localResult = await saveVideoLocally(req.file);
    
    // Vaqtinchalik faylni o'chirish
    if (fs.existsSync(req.file.path)) {
      fs.unlinkSync(req.file.path);
      tempFileCleaned = true;
    }

    console.log('✅ Video muvaffaqiyatli yuklandi:', localResult.fileName);

    // Response
    res.status(201).json({
      success: true,
      message: "Video muvaffaqiyatli yuklandi",
      data: {
        videoUrl: localResult.url,
        videoPublicUrl: `${req.protocol}://${req.get('host')}${localResult.url}`,
        fileName: localResult.fileName,
        fileSize: localResult.size,
        mimeType: localResult.mimeType
      }
    });

  } catch (err) {
    console.error("❌ Video yuklashda xatolik:", err);
    
    // Agar fayl yuklangan bo'lsa va xatolik yuz bersa, uni o'chirish
    if (req.file && fs.existsSync(req.file.path) && !tempFileCleaned) {
      fs.unlinkSync(req.file.path);
    }
    
    res.status(500).json({ 
      success: false, 
      message: err.message || "Video yuklashda xatolik"
    });
  }
};