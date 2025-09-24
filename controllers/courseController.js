// controllers/courseController.js
const Course = require('../models/Course');
const Module = require('../models/Module');
const Lesson = require('../models/Lesson');
const mongoose = require('mongoose');

// ✅ Kurs yaratish
exports.createCourse = async (req, res) => {
  try {
    const { 
      title, 
      description, 
      shortDescription, 
      category, 
      subcategory, 
      level, 
      price,
      thumbnail,
      objectives,
      requirements 
    } = req.body;

    // Validatsiya
    if (!title || !description || !category) {
      return res.status(400).json({
        success: false,
        message: "Sarlavha, tavsif va kategoriya talab qilinadi"
      });
    }

    const course = new Course({
      title: title.trim(),
      description: description.trim(),
      shortDescription: shortDescription?.trim() || description.substring(0, 200),
      category,
      subcategory,
      level: level || 'all',
      teacher: req.user.id,
      price: price || { amount: 0, currency: 'USD', isFree: true },
      thumbnail,
      learningOutcomes: objectives || [],
      requirements: requirements || [],
      status: 'draft'
    });

    await course.save();
    await course.populate('teacher', 'name email avatar');

    res.status(201).json({
      success: true,
      message: 'Kurs muvaffaqiyatli yaratildi',
      data: { course }
    });

  } catch (err) {
    console.error('Create course error:', err);
    res.status(500).json({
      success: false,
      message: 'Kurs yaratishda xatolik',
      error: process.env.NODE_ENV === 'development' ? err.message : undefined
    });
  }
};

// ✅ Barcha kurslarni olish
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
      sortOrder = 'desc'
    } = req.query;

    const query = { isDeleted: false, status: 'published' };
    
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
    console.error('Get courses error:', err);
    res.status(500).json({
      success: false,
      message: 'Kurslarni olishda xatolik'
    });
  }
};

// ✅ Mening kurslarim
exports.getMyCourses = async (req, res) => {
  try {
    const { page = 1, limit = 10, status } = req.query;
    
    const query = { 
      teacher: req.user.id, 
      isDeleted: false 
    };
    
    if (status) query.status = status;

    const courses = await Course.find(query)
      .populate('lessons')
      .populate('teacher', 'name avatar')
      .sort({ createdAt: -1 })
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
          totalCourses: total
        }
      }
    });

  } catch (err) {
    console.error('Get my courses error:', err);
    res.status(500).json({
      success: false,
      message: 'Kurslarni olishda xatolik'
    });
  }
};

// ✅ Kursni olish
exports.getCourse = async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: 'Noto‘g‘ri kurs ID si'
      });
    }

    const course = await Course.findById(id)
      .populate('teacher', 'name avatar bio rating experienceYears')
      .populate({
        path: 'modules',
        match: { isDeleted: false },
        populate: {
          path: 'lessons',
          match: { isDeleted: false, status: 'published' },
          select: 'title type duration order'
        }
      })
      .populate('lessons', 'title type duration order');

    if (!course || course.isDeleted) {
      return res.status(404).json({
        success: false,
        message: 'Kurs topilmadi'
      });
    }

    // Faqat published kurslar yoki o'qituvchi/o'quvchi ko'ra oladi
    if (course.status !== 'published' && 
        course.teacher._id.toString() !== req.user.id && 
        req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Ushbu kursga kirish huquqi yo‘q'
      });
    }

    res.json({
      success: true,
      data: { course }
    });

  } catch (err) {
    console.error('Get course error:', err);
    res.status(500).json({
      success: false,
      message: 'Kursni olishda xatolik'
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
      teacher: req.user.id,
      isDeleted: false
    });

    if (!course) {
      return res.status(404).json({
        success: false,
        message: 'Kurs topilmadi yoki sizga tegishli emas'
      });
    }

    // Ma'lum fieldlarni yangilash
    const allowedFields = [
      'title', 'description', 'shortDescription', 'category', 'subcategory',
      'level', 'price', 'thumbnail', 'learningOutcomes', 'requirements',
      'tags', 'meta'
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
};

// ✅ Kursni nashr qilish
exports.publishCourse = async (req, res) => {
  try {
    const { id } = req.params;

    const course = await Course.findOne({
      _id: id,
      teacher: req.user.id,
      isDeleted: false
    }).populate('lessons').populate('modules');

    if (!course) {
      return res.status(404).json({
        success: false,
        message: 'Kurs topilmadi'
      });
    }

    // Kursni nashr qilish uchun minimal talablar
    if (course.lessons.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Kursda kamida bitta dars bo‘lishi kerak'
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
      message: 'Kursni nashr qilishda xatolik'
    });
  }
};

// ✅ Soft-delete kurs
exports.deleteCourse = async (req, res) => {
  try {
    const { id } = req.params;

    const course = await Course.findOneAndUpdate(
      { 
        _id: id, 
        teacher: req.user.id, 
        isDeleted: false 
      },
      { 
        isDeleted: true,
        status: 'archived'
      },
      { new: true }
    );

    if (!course) {
      return res.status(404).json({
        success: false,
        message: 'Kurs topilmadi yoki sizga tegishli emas'
      });
    }

    res.json({
      success: true,
      message: 'Kurs muvaffaqiyatli o‘chirildi'
    });

  } catch (err) {
    console.error('Delete course error:', err);
    res.status(500).json({
      success: false,
      message: 'Kursni o‘chirishda xatolik'
    });
  }
};

// ✅ Kursni tugallangan deb belgilash
exports.completeCourse = async (req, res) => {
  try {
    const { id } = req.params;

    const course = await Course.findById(id);
    if (!course || course.isDeleted) {
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
      message: 'Kursni tugallashda xatolik'
    });
  }
};

// ✅ Kurs statistikasi
exports.getCourseStats = async (req, res) => {
  try {
    const { id } = req.params;

    const course = await Course.findById(id);
    if (!course || course.teacher.toString() !== req.user.id) {
      return res.status(404).json({
        success: false,
        message: 'Kurs topilmadi'
      });
    }

    // Turli statistik ma'lumotlarni yig'ish
    const stats = {
      totalStudents: 0, // Progress modelidan olish kerak
      completionRate: 0,
      averageRating: course.rating?.average || 0,
      totalLessons: course.lessons.length,
      totalDuration: 0, // Darslarning davomiyligini yig'ish
      revenue: 0 // To'lov tizimi bilan integratsiya
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
};