// controllers/courseController.js
const Course = require('../models/Course');
const Module = require('../models/Module');
const Lesson = require('../models/Lesson');
const mongoose = require('mongoose');

// ✅ Auth middleware tekshiruvi
const checkAuth = (req, res, next) => {
  if (!req.user || !req.user.id) {
    return res.status(401).json({
      success: false,
      message: 'Avtorizatsiya talab qilinadi'
    });
  }
  next();
};

// 👑 ADMIN: Barcha kurslarni olish (faqat admin)
exports.getAllCoursesAdmin = async (req, res) => {
  try {
    const {
      page = 1,
      limit = 10,
      status,
      category,
      teacher,
      search
    } = req.query;

    // Filter qurish
    const filter = { isDeleted: false };

    if (status) filter.status = status;
    if (category) filter.category = category;
    if (teacher && mongoose.Types.ObjectId.isValid(teacher)) {
      filter.teacher = teacher;
    }
    if (search) {
      filter.$or = [
        { title: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } }
      ];
    }

    // Kurslarni olish teacher ma'lumotlari bilan
    const courses = await Course.find(filter)
      .populate('teacher', 'name email avatar')
      .populate('modules')
      .populate('students', 'name email')
      .limit(limit * 1)
      .skip((page - 1) * limit)
      .sort({ createdAt: -1 });

    const total = await Course.countDocuments(filter);

    res.status(200).json({
      success: true,
      courses,
      totalPages: Math.ceil(total / limit),
      currentPage: parseInt(page),
      total
    });
  } catch (err) {
    console.error('Admin courses error:', err);
    res.status(500).json({
      success: false,
      message: 'Kurslarni olishda xato',
      error: err.message
    });
  }
};

// ✅ Kurs yaratish
exports.createCourse = async (req, res) => {
  try {
    const { title, description, category, price, level, requirements, learningOutcomes } = req.body;

    // Validatsiya
    if (!title || !category) {
      return res.status(400).json({
        success: false,
        message: 'Sarlavha va kategoriya talab qilinadi'
      });
    }

    const newCourse = await Course.create({
      title,
      description,
      category,
      level: level || 'beginner',
      requirements: requirements || [],
      learningOutcomes: learningOutcomes || [],
      price: price || { amount: 0, currency: 'USD', isFree: true },
      teacher: req.user.id,
      status: 'draft'
    });

    // Yangi kursni populate qilish
    const populatedCourse = await Course.findById(newCourse._id)
      .populate('teacher', 'name email avatar');

    res.status(201).json({
      success: true,
      message: 'Kurs muvaffaqiyatli yaratildi',
      data: { course: populatedCourse }
    });
  } catch (err) {
    console.error("Course create error:", err);
    res.status(500).json({
      success: false,
      message: "Server xatosi: " + err.message
    });
  }
};

// ✅ Mening kurslarim
exports.getMyCourses = async (req, res) => {
  try {
    console.log('=== GET MY COURSES DEBUG ===');
    console.log('1. Request user:', req.user);

    // User ma'lumotlarini tekshirish
    if (!req.user || !req.user.id) {
      console.log('❌ ERROR: User ma\'lumotlari yo\'q');
      return res.status(400).json({
        success: false,
        message: 'Foydalanuvchi ma\'lumotlari topilmadi'
      });
    }

    console.log('2. User ID:', req.user.id);

    const {
      page = 1,
      limit = 10,
      status
    } = req.query;

    console.log('3. Query params:', { page, limit, status });

    // Query ni yaratish
    const query = {
      teacher: req.user.id,
      isDeleted: false
    };

    // Status filteri
    if (status && status !== 'all') {
      query.status = status;
    }

    console.log('4. Database query:', JSON.stringify(query));

    // Database so'rovi
    const courses = await Course.find(query)
      .populate('teacher', 'name avatar email')
      .populate({
        path: 'modules',
        match: { isDeleted: false },
        populate: {
          path: 'lessons',
          match: { isDeleted: false }
        }
      })
      .sort({ createdAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit);

    const total = await Course.countDocuments(query);

    console.log('5. Topilgan kurslar soni:', courses.length);

    // Kurslarni tekshirish
    if (courses.length > 0) {
      console.log('6. Birinchi kurs:', {
        id: courses[0]._id,
        title: courses[0].title,
        teacher: courses[0].teacher,
        status: courses[0].status,
        modulesCount: courses[0].modules?.length
      });
    }

    console.log('=== DEBUG TAMAMLANDI ===');

    res.json({
      success: true,
      data: {
        courses,
        pagination: {
          currentPage: parseInt(page),
          totalPages: Math.ceil(total / limit),
          totalCourses: total,
          hasNextPage: page < Math.ceil(total / limit),
          hasPrevPage: page > 1
        }
      }
    });

  } catch (err) {
    console.error('❌ Get my courses error:', err);
    res.status(500).json({
      success: false,
      message: 'Kurslarni olishda xatolik: ' + err.message
    });
  }
};

// ✅ Barcha kurslarni olish - FAQL PUBLISHED KURSLAR
exports.getAllCourses = async (req, res) => {
  try {
    const { page = 1, limit = 10, category, level, search } = req.query;

    // Faqat published kurslarni ko'rsatish
    const filter = {
      status: 'published',
      isDeleted: false
    };

    if (category) filter.category = category;
    if (level) filter.level = level;
    if (search) {
      filter.$or = [
        { title: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } }
      ];
    }

    const courses = await Course.find(filter)
      .populate('teacher', 'name email avatar')
      .select('-modules -students -enrolledStudents')
      .limit(limit * 1)
      .skip((page - 1) * limit)
      .sort({ createdAt: -1 });

    const total = await Course.countDocuments(filter);

    res.status(200).json({
      success: true,
      courses,
      totalPages: Math.ceil(total / limit),
      currentPage: parseInt(page),
      total
    });
  } catch (err) {
    res.status(500).json({
      success: false,
      message: 'Kurslarni olishda xato',
      error: err.message
    });
  }
};

// ✅ Kursni olish
exports.getCourse = async (req, res) => {
  try {
    const { id } = req.params;

    console.log('=== GET COURSE DEBUG ===');
    console.log('1. Requested course ID:', id);
    console.log('2. Request user:', req.user);

    if (!mongoose.Types.ObjectId.isValid(id)) {
      console.log('❌ ERROR: Invalid course ID format');
      return res.status(400).json({
        success: false,
        message: 'Noto‘g‘ri kurs ID si'
      });
    }

    // Kursni olish va modullarni populate qilish
    const course = await Course.findOne({
      _id: id,
      isDeleted: false
    })
      .populate('teacher', 'name avatar bio rating experienceYears')
      .populate({
        path: 'modules',
        match: { isDeleted: false },
        options: { sort: { order: 1 } },
        populate: {
          path: 'lessons',
          match: { isDeleted: false, status: 'published' },
          options: { sort: { order: 1 } }
        }
      });

    console.log('3. Found course:', course ? {
      id: course._id,
      title: course.title,
      status: course.status,
      teacher: course.teacher?._id,
      modulesCount: course.modules?.length
    } : 'Course not found');

    if (!course) {
      console.log('❌ ERROR: Course not found');
      return res.status(404).json({
        success: false,
        message: 'Kurs topilmadi'
      });
    }

    // Faqat published kurslar yoki o'qituvchi/o'quvchi ko'ra oladi
    const isOwner = req.user && course.teacher._id.toString() === req.user.id;
    const isAdmin = req.user && req.user.role === 'admin';

    console.log('4. Access check:', {
      courseStatus: course.status,
      isOwner,
      isAdmin,
      hasUser: !!req.user
    });

    if (course.status !== 'published' && !isOwner && !isAdmin) {
      console.log('❌ ERROR: Access denied - not owner/admin and course not published');
      return res.status(403).json({
        success: false,
        message: 'Ushbu kursga kirish huquqi yo‘q'
      });
    }

    console.log('✅ SUCCESS: Course access granted');
    res.json({
      success: true,
      data: { course }
    });

  } catch (err) {
    console.error('Get course error:', err);
    res.status(500).json({
      success: false,
      message: 'Kursni olishda xatolik: ' + err.message
    });
  }
};

// ✅ Kursni yangilash
exports.updateCourse = async (req, res) => {
  try {
    const { id } = req.params;
    const updateData = req.body;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: 'Noto‘g‘ri kurs ID si'
      });
    }

    const course = await Course.findOne({
      _id: id,
      isDeleted: false
    });

    if (!course) {
      return res.status(404).json({
        success: false,
        message: 'Kurs topilmadi'
      });
    }

    // Faqat o'qituvchi yoki admin yangilashi mumkin
    if (course.teacher.toString() !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Sizda ushbu kursni yangilash huquqi yo‘q'
      });
    }

    // Ma'lum fieldlarni yangilash
    const allowedFields = [
      'title', 'description', 'shortDescription', 'category', 'subcategory',
      'level', 'price', 'thumbnail', 'learningOutcomes', 'requirements',
      'tags', 'meta', 'status'
    ];

    Object.keys(updateData).forEach(key => {
      if (allowedFields.includes(key)) {
        course[key] = updateData[key];
      }
    });

    if (updateData.price) {
      course.price = {
        ...course.price,
        ...updateData.price,
        isFree: updateData.price.amount === 0
      };
    }

    await course.save();
    await course.populate('teacher', 'name avatar');

    res.json({
      success: true,
      message: 'Kurs muvaffaqiyatli yangilandi',
      data: { course }
    });

  } catch (err) {
    console.error('Update course error:', err);
    res.status(500).json({
      success: false,
      message: 'Kursni yangilashda xatolik: ' + err.message
    });
  }
};

exports.publishCourse = async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: 'Noto‘g‘ri kurs ID si'
      });
    }

    // Kursni olish modullar bilan
    const course = await Course.findOne({
      _id: id,
      isDeleted: false
    }).populate({
      path: 'modules',
      match: { isDeleted: false },
      options: { sort: { order: 1 } },
      populate: {
        path: 'lessons',
        match: { isDeleted: false },
        options: { sort: { order: 1 } }
      }
    });

    if (!course) {
      return res.status(404).json({
        success: false,
        message: 'Kurs topilmadi'
      });
    }

    // Faqat o'qituvchi yoki admin nashr qilishi mumkin
    if (course.teacher.toString() !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Sizda ushbu kursni nashr qilish huquqi yo‘q'
      });
    }

    // Kursni nashr qilish uchun minimal talablar
    const totalLessons = course.modules.reduce(
      (acc, module) => acc + (module.lessons?.length || 0),
      0
    );

    if (!course.modules || course.modules.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Kursda kamida bitta modul bo‘lishi kerak'
      });
    }

    if (totalLessons === 0) {
      return res.status(400).json({
        success: false,
        message: 'Kursda kamida bitta dars bo‘lishi kerak'
      });
    }

    const modulesWithoutLessons = course.modules.filter(
      module => !module.lessons || module.lessons.length === 0
    );

    if (modulesWithoutLessons.length > 0) {
      return res.status(400).json({
        success: false,
        message: `Quyidagi modullarda darslar mavjud emas: ${modulesWithoutLessons
          .map(m => m.title)
          .join(', ')}`
      });
    }

    const requiredFields = ['title', 'description', 'category'];
    const missingFields = requiredFields.filter(field => !course[field]);

    if (missingFields.length > 0) {
      return res.status(400).json({
        success: false,
        message: `Quyidagi maydonlar to'ldirilishi kerak: ${missingFields.join(', ')}`
      });
    }

    // Nashr qilish
    course.status = 'published';
    course.publishedAt = new Date();
    await course.save();

    res.json({
      success: true,
      message: 'Kurs muvaffaqiyatli nashr qilindi!',
      data: {
        course: {
          _id: course._id,
          title: course.title,
          status: course.status,
          publishedAt: course.publishedAt
        }
      }
    });

  } catch (err) {
    console.error('Publish course error:', err);
    res.status(500).json({
      success: false,
      message: 'Kursni nashr qilishda xatolik: ' + err.message
    });
  }
};


// 🚫 KURSNI NASHRDAN OLISH
exports.unpublishCourse = async (req, res) => {
  try {
    const { id } = req.params;

    console.log('=== UNPUBLISH COURSE DEBUG ===');
    console.log('1. Course ID:', id);
    console.log('2. User:', req.user);

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: 'Noto‘g‘ri kurs ID si'
      });
    }

    const course = await Course.findOne({
      _id: id,
      isDeleted: false
    });

    if (!course) {
      console.log('❌ ERROR: Course not found');
      return res.status(404).json({
        success: false,
        message: 'Kurs topilmadi'
      });
    }

    // Faqat o'qituvchi yoki admin nashrdan olishi mumkin
    if (course.teacher.toString() !== req.user.id && req.user.role !== 'admin') {
      console.log('❌ ERROR: Not authorized to unpublish this course');
      return res.status(403).json({
        success: false,
        message: 'Sizda ushbu kursni nashrdan olish huquqi yo‘q'
      });
    }

    console.log('3. Course current status:', course.status);

    // Faqat published kursni nashrdan olish mumkin
    if (course.status !== 'published') {
      return res.status(400).json({
        success: false,
        message: 'Faqat nashr qilingan kursni nashrdan olish mumkin'
      });
    }

    // Kursni nashrdan olish
    course.status = 'draft';
    course.publishedAt = null;
    await course.save();

    console.log('✅ SUCCESS: Course unpublished successfully');

    res.json({
      success: true,
      message: 'Kurs nashrdan olindi',
      data: {
        course: {
          _id: course._id,
          title: course.title,
          status: course.status
        }
      }
    });

  } catch (err) {
    console.error('❌ Unpublish course error:', err);
    res.status(500).json({
      success: false,
      message: 'Kursni nashrdan olishda xatolik: ' + err.message
    });
  }
};

// ✅ Tugallangan deb belgilash
exports.completeCourse = async (req, res) => {
  try {
    const { id } = req.params;

    // ID validatsiyasi
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: "Noto'g'ri kurs ID formati"
      });
    }

    const course = await Course.findOne({
      _id: id,
      isDeleted: false
    });

    if (!course) {
      return res.status(404).json({
        success: false,
        message: "Kurs topilmadi"
      });
    }

    // Faqat o'qituvchi yoki admin belgilashi mumkin
    if (course.teacher.toString() !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: "Faqat kurs muallifi yoki admin tugallashi mumkin"
      });
    }

    if (course.isCompleted) {
      return res.status(400).json({
        success: false,
        message: "Bu kurs allaqachon tugallangan"
      });
    }

    course.isCompleted = true;
    course.completedAt = new Date();
    await course.save();

    res.json({
      success: true,
      message: "Kurs tugallangan deb belgilandi",
      data: { course }
    });

  } catch (err) {
    console.error('Complete course error:', err);
    res.status(500).json({
      success: false,
      message: 'Kursni tugallashda xatolik: ' + err.message
    });
  }
};

// ✅ DELETE kurs
exports.deleteCourse = async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: 'Noto‘g‘ri kurs ID si'
      });
    }

    const course = await Course.findOne({
      _id: id,
      isDeleted: false
    });

    if (!course) {
      return res.status(404).json({
        success: false,
        message: 'Kurs topilmadi'
      });
    }

    // Faqat o'qituvchi yoki admin o'chirishi mumkin
    if (course.teacher.toString() !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Sizda ushbu kursni o‘chirish huquqi yo‘q'
      });
    }

    // Nashr qilingan kursni o'chirishni cheklash
    if (course.status === 'published') {
      return res.status(400).json({
        success: false,
        message: 'Nashr qilingan kursni o‘chirib bo‘lmaydi. Avval nashrdan oling.'
      });
    }

    // Soft delete qilish
    course.isDeleted = true;
    course.status = 'archived';
    course.deletedAt = new Date();
    await course.save();

    res.json({
      success: true,
      message: 'Kurs muvaffaqiyatli o‘chirildi'
    });

  } catch (err) {
    console.error('Delete course error:', err);
    res.status(500).json({
      success: false,
      message: 'Kursni o‘chirishda xatolik: ' + err.message
    });
  }
};

// ✅ Kurs statistikasi
exports.getCourseStats = async (req, res) => {
  try {
    const { id } = req.params;

    const course = await Course.findOne({
      _id: id,
      isDeleted: false
    }).populate({
      path: 'modules',
      match: { isDeleted: false },
      populate: {
        path: 'lessons',
        match: { isDeleted: false }
      }
    });

    if (!course) {
      return res.status(404).json({
        success: false,
        message: 'Kurs topilmadi'
      });
    }

    // Faqat o'qituvchi yoki admin ko'ra oladi
    if (course.teacher.toString() !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Sizda ushbu statistikani ko‘rish huquqi yo‘q'
      });
    }

    // Statistik ma'lumotlar
    const totalLessons = course.modules?.reduce((acc, module) =>
      acc + (module.lessons?.length || 0), 0) || 0;

    const totalDuration = course.modules?.reduce((acc, module) =>
      acc + module.lessons?.reduce((lessonAcc, lesson) =>
        lessonAcc + (lesson.duration || 0), 0), 0) || 0;

    const stats = {
      totalStudents: course.students?.length || 0,
      completionRate: 0,
      averageRating: course.rating?.average || 0,
      totalLessons,
      totalDuration,
      totalModules: course.modules?.length || 0,
      revenue: 0
    };

    res.json({
      success: true,
      data: { stats }
    });

  } catch (err) {
    console.error('Get course stats error:', err);
    res.status(500).json({
      success: false,
      message: 'Statistikani olishda xatolik: ' + err.message
    });
  }
};

module.exports = exports;