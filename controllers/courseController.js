// controllers/courseController.js
const Course = require('../models/Course');
const Module = require('../models/Module');
const Lesson = require('../models/Lesson');
const mongoose = require('mongoose');

// ✅ Auth middleware tekshiruvi qo'shamiz
const checkAuth = (req, res, next) => {
  if (!req.user || !req.user.id) {
    return res.status(401).json({
      success: false,
      message: 'Avtorizatsiya talab qilinadi'
    });
  }
  next();
};

// ✅ Kurs yaratish
exports.createCourse = [checkAuth, async (req, res) => {
  try {
    const { title, description, category, price } = req.body;

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
      price: price || { amount: 0, currency: 'USD', isFree: true },
      teacher: req.user.id,
      status: 'draft'
    });

    res.status(201).json({
      success: true,
      message: 'Kurs muvaffaqiyatli yaratildi',
      data: { course: newCourse }
    });
  } catch (err) {
    console.error("Course create error:", err);
    res.status(500).json({
      success: false,
      message: "Server xatosi: " + err.message
    });
  }
}];

// ✅ Barcha kurslarni olish
// ✅ Barcha kurslarni olish - FAQL PUBLISHED KURSLAR
exports.getAllCourses = async (req, res) => {
  try {
    const { 
      page = 1, 
      limit = 12, 
      category, 
      level, 
      minPrice, 
      maxPrice, 
      search,
      sortBy = 'createdAt',
      sortOrder = 'desc',
      status = 'published' // DEFAULT FAQL PUBLISHED
    } = req.query;

    const query = { 
      isDeleted: false,
      status: 'published' // HAR DOIM FAQL PUBLISHED KURSLAR
    };
    
    // Studentlar uchun faqat published kurslar ko'rsatiladi
    // Agar admin/teacher bo'lsa, boshqa statuslarni ko'rsatish mumkin
    const userRole = req.user?.role;
    if ((userRole === 'admin' || userRole === 'teacher') && status && status !== 'all') {
      query.status = status;
    }

    // Filtrlash
    if (category) query.category = category;
    if (level && level !== 'all') query.level = level;
    if (search) {
      query.$or = [
        { title: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } },
        { shortDescription: { $regex: search, $options: 'i' } }
      ];
    }

    // Narx filtri
    if (minPrice || maxPrice) {
      query['price.amount'] = {};
      if (minPrice) query['price.amount'].$gte = parseFloat(minPrice);
      if (maxPrice) query['price.amount'].$lte = parseFloat(maxPrice);
    }

    const sortOptions = {};
    sortOptions[sortBy] = sortOrder === 'desc' ? -1 : 1;

    console.log('📊 Courses query:', {
      query,
      userRole,
      requestedStatus: status
    });

    // Database dan kurslarni olish
    const courses = await Course.find(query)
      .populate('teacher', 'name avatar rating')
      .populate('lessons')
      .sort(sortOptions)
      .limit(limit * 1)
      .skip((page - 1) * limit);

    const total = await Course.countDocuments(query);

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
    console.error('❌ Get courses error:', err);
    res.status(500).json({
      success: false,
      message: 'Kurslarni olishda xatolik'
    });
  }
};
// ✅ Mening kurslarim
// controllers/courseController.js - TO'G'RILANGAN getMyCourses
// controllers/courseController.js - TO'G'RILANGAN getMyCourses
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
    console.log('3. User ID type:', typeof req.user.id);

    const mongoose = require('mongoose');
    
    // User ID ni ObjectId ga convert qilish
    let teacherId;
    try {
      teacherId = new mongoose.Types.ObjectId(req.user.id);
      console.log('4. Converted teacherId:', teacherId);
    } catch (error) {
      console.log('❌ ERROR: User ID ni ObjectId ga convert qilishda xato:', error);
      return res.status(400).json({
        success: false,
        message: 'Noto‘g‘ri foydalanuvchi ID formati'
      });
    }

    const { 
      page = 1, 
      limit = 10, 
      status 
    } = req.query;

    console.log('5. Query params:', { page, limit, status });

    // Query ni yaratish - ObjectId bilan
    const query = { 
      teacher: teacherId, // ObjectId ni ishlatamiz
      isDeleted: false 
    };
    
    // Status filteri
    if (status && status !== 'all') {
      query.status = status;
    }

    console.log('6. Database query:', JSON.stringify(query));

    // Database so'rovi
    const courses = await Course.find(query)
      .populate('teacher', 'name avatar email')
      .populate('lessons', 'title duration order')
      .sort({ createdAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit);

    const total = await Course.countDocuments(query);

    console.log('7. Topilgan kurslar soni:', courses.length);
    
    // Kurslarni tekshirish
    if (courses.length > 0) {
      console.log('8. Birinchi kurs:', {
        id: courses[0]._id,
        title: courses[0].title,
        teacher: courses[0].teacher,
        status: courses[0].status
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
// ✅ Kursni olish
// ✅ Kursni olish
// ✅ Kursni olish - YANGILANGAN
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
    const course = await Course.findById(id)
      .populate('teacher', 'name avatar bio rating experienceYears')
      .populate({
        path: 'modules',
        match: { isDeleted: false }, // Faqat o'chirilmagan modullar
        options: { sort: { order: 1 } }, // Tartib bo'yicha saralash
        populate: {
          path: 'lessons',
          match: { isDeleted: false, status: 'published' }, // Faqat published darslar
          options: { sort: { order: 1 } } // Tartib bo'yicha saralash
        }
      });

    console.log('3. Found course:', course ? {
      id: course._id,
      title: course.title,
      status: course.status,
      teacher: course.teacher?._id,
      modulesCount: course.modules?.length,
      isDeleted: course.isDeleted
    } : 'Course not found');

    if (!course || course.isDeleted) {
      console.log('❌ ERROR: Course not found or deleted');
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
exports.updateCourse = [checkAuth, async (req, res) => {
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
      message: 'Kursni yangilashda xatolik'
    });
  }
}];

// ✅ Kursni nashr qilish
// controllers/courseController.js - TO'G'RILANGAN VERSIYA

// ✅ Kursni nashr qilish - TO'G'RILANGAN
exports.publishCourse = async (req, res) => {
  try {
    const { id } = req.params;

    const course = await Course.findOne({
      _id: id,
      isDeleted: false
    }).populate('lessons'); // Faqat mavjud fieldlarni populate qilamiz

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
    if (!course.lessons || course.lessons.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Kursda kamida bitta dars bo‘lishi kerak'
      });
    }

    // Kurs ma'lumotlarini tekshirish
    const requiredFields = ['title', 'description', 'category'];
    const missingFields = requiredFields.filter(field => !course[field]);
    
    if (missingFields.length > 0) {
      return res.status(400).json({
        success: false,
        message: `Quyidagi maydonlar to'ldirilishi kerak: ${missingFields.join(', ')}`
      });
    }

    course.status = 'published';
    course.publishedAt = new Date();
    await course.save();

    res.json({
      success: true,
      message: 'Kurs muvaffaqiyatli nashr qilindi',
      data: { course }
    });

  } catch (err) {
    console.error('Publish course error:', err);
    res.status(500).json({
      success: false,
      message: 'Kursni nashr qilishda xatolik: ' + err.message
    });
  }
};

// ✅ Tugallangan deb belgilash - TO'G'RILANGAN
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
// ✅ DELETE kurs - TO'G'RILANGAN VERSIYA
exports.deleteCourse = [checkAuth, async (req, res) => {
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
        message: 'Nashr qilingan kursni o‘chirib bo‘lmaydi. Avval arxivlang.'
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
}];


// ✅ Kurs statistikasi
exports.getCourseStats = [checkAuth, async (req, res) => {
  try {
    const { id } = req.params;

    const course = await Course.findById(id);
    if (!course || course.isDeleted) {
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
    const stats = {
      totalStudents: 0,
      completionRate: 0,
      averageRating: course.rating?.average || 0,
      totalLessons: course.lessons.length,
      totalDuration: 0,
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
      message: 'Statistikani olishda xatolik'
    });
  }
}];