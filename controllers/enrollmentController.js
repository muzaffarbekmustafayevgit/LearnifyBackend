const Enrollment = require('../models/Enrollment');
const Course = require('../models/Course');
const User = require('../models/User');
const mongoose = require('mongoose');

/**
 * ✅ Kursga yozilish (bepul kurslar uchun)
 */
// controllers/enrollmentController.js - enrollInCourse funksiyasini yangilaymiz

exports.enrollInCourse = async (req, res) => {
  const session = await mongoose.startSession();
  session.startTransaction();
  
  try {
    const { courseId } = req.params;
    const studentId = req.user.id;

    console.log('=== ENROLLMENT DEBUG ===');
    console.log('1. Course ID:', courseId);
    console.log('2. Student ID:', studentId);
    console.log('3. User role:', req.user.role);

    // ID larni tekshirish
    if (!mongoose.Types.ObjectId.isValid(courseId)) {
      await session.abortTransaction();
      session.endSession();
      
      return res.status(400).json({
        success: false,
        message: 'Noto‘g‘ri kurs ID si'
      });
    }

    // Foydalanuvchini tekshirish
    const student = await User.findById(studentId).session(session);
    if (!student) {
      await session.abortTransaction();
      session.endSession();
      
      return res.status(404).json({
        success: false,
        message: 'Foydalanuvchi topilmadi'
      });
    }

    console.log('4. Student found:', student.name);

    // Kursni tekshirish - barcha shartlarni yumshatamiz
    const course = await Course.findOne({
      _id: courseId
      // isDeleted: false, // Hozircha kommentga olamiz
      // status: 'published' // Hozircha kommentga olamiz
    }).session(session);

    if (!course) {
      await session.abortTransaction();
      session.endSession();
      
      console.log('❌ Course not found with ID:', courseId);
      return res.status(404).json({
        success: false,
        message: 'Kurs topilmadi'
      });
    }

    console.log('5. Course found:', course.title);
    console.log('6. Course status:', course.status);
    console.log('7. Course isDeleted:', course.isDeleted);
    console.log('8. Course teacher:', course.teacher);

    // Kurs nashr qilinmagan yoki o'chirilgan bo'lsa xabar beramiz
    if (course.isDeleted) {
      await session.abortTransaction();
      session.endSession();
      
      return res.status(404).json({
        success: false,
        message: 'Kurs o\'chirilgan'
      });
    }

    if (course.status !== 'published') {
      await session.abortTransaction();
      session.endSession();
      
      return res.status(404).json({
        success: false,
        message: 'Kurs hali nashr qilinmagan'
      });
    }

    // O'qituvchi o'z kursiga yozilolmasligi
    if (course.teacher.toString() === studentId) {
      await session.abortTransaction();
      session.endSession();
      
      return res.status(400).json({
        success: false,
        message: 'Siz o‘z kursingizga yozilolmaysiz'
      });
    }

    // Oldin yozilganligini tekshirish
    const existingEnrollment = await Enrollment.findOne({
      student: studentId,
      course: courseId
    }).session(session);

    if (existingEnrollment) {
      await session.abortTransaction();
      session.endSession();
      
      return res.status(409).json({
        success: false,
        message: 'Siz ushbu kursga allaqachon yozilgansiz'
      });
    }

    console.log('9. No existing enrollment found');

    // Kursdagi jami darslar sonini hisoblash
    const Lesson = mongoose.model('Lesson');
    const totalLessons = await Lesson.countDocuments({
      course: courseId,
      isDeleted: false
      // status: 'published' // Hozircha kommentga olamiz
    }).session(session);

    console.log('10. Total lessons in course:', totalLessons);

    // Yangi enrollment yaratish
    const enrollmentData = {
      student: studentId,
      course: courseId,
      status: 'active',
      progress: {
        totalLessons: totalLessons,
        completedLessons: [],
        completedLessonsCount: 0,
        completionPercentage: 0,
        lastAccessed: new Date()
      },
      enrolledAt: new Date()
    };

    const enrollment = await Enrollment.create([enrollmentData], { session });
    const newEnrollment = enrollment[0];

    // Kursdagi studentlar sonini yangilash
    await Course.findByIdAndUpdate(
      courseId,
      {
        $addToSet: { students: studentId },
        $inc: { enrollmentCount: 1 }
      },
      { session }
    );

    // Ma'lumotlarni populate qilish
    await newEnrollment.populate([
      {
        path: 'student',
        select: 'name email avatar'
      },
      {
        path: 'course',
        select: 'title thumbnail price level category teacher description duration',
        populate: {
          path: 'teacher',
          select: 'name avatar rating bio'
        }
      }
    ]);

    console.log('11. Enrollment created successfully');

    await session.commitTransaction();
    session.endSession();

    res.status(201).json({
      success: true,
      message: 'Kursga muvaffaqiyatli yozildingiz!',
      data: { 
        enrollment: newEnrollment,
        course: {
          _id: course._id,
          title: course.title,
          thumbnail: course.thumbnail,
          description: course.description
        }
      }
    });

  } catch (err) {
    await session.abortTransaction();
    session.endSession();
    
    console.error('❌ Enrollment error details:', err);
    
    // Duplicate key error (allaqachon yozilgan)
    if (err.code === 11000) {
      return res.status(409).json({
        success: false,
        message: 'Siz ushbu kursga allaqachon yozilgansiz'
      });
    }

    // MongoDB validation error
    if (err.name === 'ValidationError') {
      const errors = Object.values(err.errors).map(error => error.message);
      return res.status(400).json({
        success: false,
        message: 'Ma\'lumotlar noto‘g‘ri: ' + errors.join(', ')
      });
    }

    res.status(500).json({
      success: false,
      message: 'Kursga yozilishda xatolik: ' + err.message
    });
  }
};

/**
 * ✅ Kursdan chiqish
 */
exports.unenrollFromCourse = async (req, res) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const { courseId } = req.params;
    const studentId = req.user.id;

    console.log('=== UNENROLLMENT DEBUG ===');
    console.log('Course ID:', courseId);
    console.log('Student ID:', studentId);

    // Enrollmentni topish
    const enrollment = await Enrollment.findOne({
      student: studentId,
      course: courseId
    }).session(session);

    if (!enrollment) {
      await session.abortTransaction();
      session.endSession();
      
      return res.status(404).json({
        success: false,
        message: 'Siz ushbu kursga yozilmagansiz'
      });
    }

    // Enrollmentni o'chirish
    await Enrollment.findByIdAndDelete(enrollment._id, { session });

    // Kursdagi studentlar ro'yxatidan o'chirish
    await Course.findByIdAndUpdate(
      courseId,
      {
        $pull: { students: studentId },
        $inc: { enrollmentCount: -1 }
      },
      { session }
    );

    await session.commitTransaction();
    session.endSession();

    res.json({
      success: true,
      message: 'Kursdan muvaffaqiyatli chiqdingiz',
      data: {
        courseId: courseId,
        unenrolledAt: new Date()
      }
    });

  } catch (err) {
    await session.abortTransaction();
    session.endSession();
    
    console.error('Unenrollment error:', err);
    res.status(500).json({
      success: false,
      message: 'Kursdan chiqishda xatolik: ' + err.message
    });
  }
};

/**
 * ✅ Mening kurslarim (o'quvchi uchun)
 */
exports.getMyEnrollments = async (req, res) => {
  try {
    const studentId = req.user.id;
    const { 
      page = 1, 
      limit = 20, 
      status,
      sortBy = 'enrolledAt',
      sortOrder = 'desc'
    } = req.query;

    console.log('=== GET MY ENROLLMENTS DEBUG ===');
    console.log('Student ID:', studentId);
    console.log('Query params:', { page, limit, status, sortBy, sortOrder });

    // Query ni tayyorlash
    const query = { student: studentId };
    if (status && status !== 'all') {
      query.status = status;
    }

    // Sort ni tayyorlash
    const sortOptions = {};
    sortOptions[sortBy] = sortOrder === 'desc' ? -1 : 1;

    // Pagination
    const pageNum = parseInt(page);
    const limitNum = parseInt(limit);
    const skip = (pageNum - 1) * limitNum;

    // Enrollmentlarni olish
    const enrollments = await Enrollment.find(query)
      .populate([
        {
          path: 'course',
          select: 'title thumbnail description level category price teacher rating enrollmentCount duration modules createdAt',
          populate: {
            path: 'teacher',
            select: 'name avatar rating bio'
          }
        },
        {
          path: 'student',
          select: 'name email avatar'
        }
      ])
      .sort(sortOptions)
      .limit(limitNum)
      .skip(skip)
      .lean();

    console.log(`Found ${enrollments.length} enrollments`);

    // Umumiy son
    const total = await Enrollment.countDocuments(query);

    // Progressni hisoblash
    const enrollmentsWithProgress = enrollments.map(enrollment => {
      const progress = enrollment.progress || {};
      const completionPercentage = progress.completionPercentage || 0;
      const completedLessonsCount = progress.completedLessonsCount || 0;
      const totalLessons = progress.totalLessons || 0;

      return {
        ...enrollment,
        progress: {
          ...progress,
          completionPercentage,
          completedLessonsCount,
          totalLessons,
          remainingLessons: totalLessons - completedLessonsCount
        }
      };
    });

    res.json({
      success: true,
      data: {
        enrollments: enrollmentsWithProgress,
        pagination: {
          currentPage: pageNum,
          totalPages: Math.ceil(total / limitNum),
          totalEnrollments: total,
          hasNextPage: pageNum < Math.ceil(total / limitNum),
          hasPrevPage: pageNum > 1,
          pageSize: limitNum
        },
        summary: {
          total,
          active: await Enrollment.countDocuments({ ...query, status: 'active' }),
          completed: await Enrollment.countDocuments({ ...query, status: 'completed' }),
          cancelled: await Enrollment.countDocuments({ ...query, status: 'cancelled' })
        }
      }
    });

  } catch (err) {
    console.error('Get enrollments error:', err);
    res.status(500).json({
      success: false,
      message: 'Kurslarni olishda xatolik: ' + err.message
    });
  }
};

/**
 * ✅ Darsni tugallangan deb belgilash
 */
exports.completeLesson = async (req, res) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const { courseId, lessonId } = req.params;
    const studentId = req.user.id;

    console.log('=== COMPLETE LESSON DEBUG ===');
    console.log('1. Course ID:', courseId);
    console.log('2. Lesson ID:', lessonId);
    console.log('3. Student ID:', studentId);

    // ID larni tekshirish
    if (!mongoose.Types.ObjectId.isValid(courseId) || !mongoose.Types.ObjectId.isValid(lessonId)) {
      await session.abortTransaction();
      session.endSession();
      
      return res.status(400).json({
        success: false,
        message: 'Noto‘g‘ri kurs yoki dars ID si'
      });
    }

    // Enrollmentni topish
    const enrollment = await Enrollment.findOne({
      student: studentId,
      course: courseId,
      status: 'active'
    }).session(session);

    if (!enrollment) {
      await session.abortTransaction();
      session.endSession();
      
      return res.status(404).json({
        success: false,
        message: 'Siz ushbu kursga yozilmagansiz yoki aktiv emas'
      });
    }

    console.log('4. Enrollment found');

    // Darsni tekshirish
    const Lesson = mongoose.model('Lesson');
    const lesson = await Lesson.findOne({
      _id: lessonId,
      course: courseId,
      isDeleted: false,
      status: 'published'
    }).session(session);

    if (!lesson) {
      await session.abortTransaction();
      session.endSession();
      
      return res.status(404).json({
        success: false,
        message: 'Dars topilmadi'
      });
    }

    console.log('5. Lesson found:', lesson.title);

    // Darsni tugallangan deb belgilash
    enrollment.updateProgress(lessonId);
    await enrollment.save({ session });

    console.log('6. Lesson completed, progress updated');

    // Yangilangan enrollmentni populate qilish
    await enrollment.populate([
      {
        path: 'course',
        select: 'title thumbnail'
      },
      {
        path: 'student',
        select: 'name'
      }
    ]);

    await session.commitTransaction();
    session.endSession();

    res.json({
      success: true,
      message: 'Dars tugallandi!',
      data: {
        enrollment: {
          _id: enrollment._id,
          progress: enrollment.progress,
          status: enrollment.status,
          course: enrollment.course
        },
        lesson: {
          _id: lesson._id,
          title: lesson.title,
          completed: true
        }
      }
    });

  } catch (err) {
    await session.abortTransaction();
    session.endSession();
    
    console.error('Complete lesson error:', err);
    res.status(500).json({
      success: false,
      message: 'Darsni tugallashda xatolik: ' + err.message
    });
  }
};

/**
 * ✅ Kurs enrollment ma'lumotlarini olish
 */
exports.getEnrollment = async (req, res) => {
  try {
    const { courseId } = req.params;
    const studentId = req.user.id;

    console.log('=== GET ENROLLMENT DEBUG ===');
    console.log('Course ID:', courseId);
    console.log('Student ID:', studentId);

    if (!mongoose.Types.ObjectId.isValid(courseId)) {
      return res.status(400).json({
        success: false,
        message: 'Noto‘g‘ri kurs ID si'
      });
    }

    const enrollment = await Enrollment.findOne({
      student: studentId,
      course: courseId
    })
      .populate([
        {
          path: 'course',
          select: 'title thumbnail description level category price teacher modules enrollmentCount rating duration createdAt',
          populate: [
            {
              path: 'teacher',
              select: 'name avatar rating bio'
            },
            {
              path: 'modules',
              match: { isDeleted: false },
              options: { sort: { order: 1 } },
              populate: {
                path: 'lessons',
                match: { isDeleted: false, status: 'published' },
                options: { sort: { order: 1 } },
                select: 'title duration type order _id isFree previewUrl'
              }
            }
          ]
        },
        {
          path: 'student',
          select: 'name email avatar'
        }
      ]);

    if (!enrollment) {
      return res.status(404).json({
        success: false,
        message: 'Siz ushbu kursga yozilmagansiz'
      });
    }

    // Progress ma'lumotlarini hisoblash
    const progress = enrollment.progress || {};
    const completionPercentage = progress.completionPercentage || 0;
    const completedLessonsCount = progress.completedLessonsCount || 0;
    const totalLessons = progress.totalLessons || 0;

    const enrollmentWithProgress = {
      ...enrollment.toObject(),
      progress: {
        ...progress,
        completionPercentage,
        completedLessonsCount,
        totalLessons,
        remainingLessons: totalLessons - completedLessonsCount,
        isCompleted: enrollment.status === 'completed'
      }
    };

    res.json({
      success: true,
      data: { 
        enrollment: enrollmentWithProgress 
      }
    });

  } catch (err) {
    console.error('Get enrollment error:', err);
    res.status(500).json({
      success: false,
      message: 'Enrollment ma\'lumotlarini olishda xatolik: ' + err.message
    });
  }
};

/**
 * ✅ Kurs studentlarini olish (o'qituvchi uchun)
 */
exports.getCourseStudents = async (req, res) => {
  try {
    const { courseId } = req.params;
    const teacherId = req.user.id;

    console.log('=== GET COURSE STUDENTS DEBUG ===');
    console.log('Course ID:', courseId);
    console.log('Teacher ID:', teacherId);

    // Kursni tekshirish (faqat o'qituvchi ko'ra oladi)
    const course = await Course.findOne({
      _id: courseId,
      teacher: teacherId,
      isDeleted: false
    });

    if (!course) {
      return res.status(404).json({
        success: false,
        message: 'Kurs topilmadi yoki sizda huquq yo\'q'
      });
    }

    const { 
      page = 1, 
      limit = 20,
      status,
      search
    } = req.query;

    // Query ni tayyorlash
    const query = { course: courseId };
    if (status && status !== 'all') {
      query.status = status;
    }

    // Pagination
    const pageNum = parseInt(page);
    const limitNum = parseInt(limit);
    const skip = (pageNum - 1) * limitNum;

    // Studentlarni olish
    let enrollmentsQuery = Enrollment.find(query)
      .populate([
        {
          path: 'student',
          select: 'name email avatar createdAt lastLogin'
        }
      ])
      .sort({ enrolledAt: -1 });

    // Search qo'shilishi
    if (search) {
      enrollmentsQuery = enrollmentsQuery.populate({
        path: 'student',
        match: {
          $or: [
            { name: { $regex: search, $options: 'i' } },
            { email: { $regex: search, $options: 'i' } }
          ]
        },
        select: 'name email avatar createdAt lastLogin'
      });
    }

    const enrollments = await enrollmentsQuery
      .limit(limitNum)
      .skip(skip);

    // Filtrlangan va umumiy son
    const total = await Enrollment.countDocuments(query);

    // Statistikani hisoblash
    const stats = await Enrollment.aggregate([
      { $match: { course: new mongoose.Types.ObjectId(courseId) } },
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 }
        }
      }
    ]);

    const statsObject = stats.reduce((acc, curr) => {
      acc[curr._id] = curr.count;
      return acc;
    }, {});

    res.json({
      success: true,
      data: {
        students: enrollments,
        course: {
          _id: course._id,
          title: course.title,
          enrollmentCount: course.enrollmentCount
        },
        pagination: {
          currentPage: pageNum,
          totalPages: Math.ceil(total / limitNum),
          totalStudents: total,
          pageSize: limitNum
        },
        stats: {
          total: total,
          active: statsObject.active || 0,
          completed: statsObject.completed || 0,
          cancelled: statsObject.cancelled || 0
        }
      }
    });

  } catch (err) {
    console.error('Get course students error:', err);
    res.status(500).json({
      success: false,
      message: 'Studentlarni olishda xatolik: ' + err.message
    });
  }
};

/**
 * ✅ Enrollment statistikasi
 */
exports.getEnrollmentStats = async (req, res) => {
  try {
    const studentId = req.user.id;

    console.log('=== GET ENROLLMENT STATS DEBUG ===');
    console.log('Student ID:', studentId);

    // Umumiy statistika
    const totalEnrollments = await Enrollment.countDocuments({ student: studentId });
    const completedCourses = await Enrollment.countDocuments({ 
      student: studentId, 
      status: 'completed' 
    });
    const activeCourses = await Enrollment.countDocuments({ 
      student: studentId, 
      status: 'active' 
    });

    // Progress bo'yicha statistika
    const progressStats = await Enrollment.aggregate([
      { $match: { student: new mongoose.Types.ObjectId(studentId) } },
      {
        $group: {
          _id: null,
          totalLessonsCompleted: { $sum: '$progress.completedLessonsCount' },
          totalLessons: { $sum: '$progress.totalLessons' },
          averageProgress: { $avg: '$progress.completionPercentage' }
        }
      }
    ]);

    // Oxirgi faollik
    const recentActivity = await Enrollment.find({ student: studentId })
      .populate('course', 'title thumbnail')
      .sort({ 'progress.lastAccessed': -1 })
      .limit(5)
      .select('progress.lastAccessed course status');

    const stats = progressStats[0] || {};

    const result = {
      summary: {
        totalEnrollments,
        completedCourses,
        activeCourses,
        cancelledCourses: totalEnrollments - completedCourses - activeCourses
      },
      progress: {
        totalLessonsCompleted: stats.totalLessonsCompleted || 0,
        totalLessons: stats.totalLessons || 0,
        averageProgress: Math.round(stats.averageProgress || 0),
        overallCompletion: totalEnrollments > 0 ? Math.round((completedCourses / totalEnrollments) * 100) : 0
      },
      recentActivity: recentActivity.map(activity => ({
        course: activity.course,
        lastAccessed: activity.progress.lastAccessed,
        status: activity.status
      }))
    };

    res.json({
      success: true,
      data: { 
        stats: result 
      }
    });

  } catch (err) {
    console.error('Get enrollment stats error:', err);
    res.status(500).json({
      success: false,
      message: 'Statistikani olishda xatolik: ' + err.message
    });
  }
};

/**
 * ✅ Enrollment statusini yangilash
 */
exports.updateEnrollmentStatus = async (req, res) => {
  try {
    const { courseId } = req.params;
    const studentId = req.user.id;
    const { status } = req.body;

    console.log('=== UPDATE ENROLLMENT STATUS DEBUG ===');
    console.log('Course ID:', courseId);
    console.log('Student ID:', studentId);
    console.log('New status:', status);

    if (!['active', 'completed', 'cancelled'].includes(status)) {
      return res.status(400).json({
        success: false,
        message: 'Noto‘g‘ri status. Faqat: active, completed, cancelled'
      });
    }

    const enrollment = await Enrollment.findOne({
      student: studentId,
      course: courseId
    });

    if (!enrollment) {
      return res.status(404).json({
        success: false,
        message: 'Enrollment topilmadi'
      });
    }

    enrollment.status = status;
    
    if (status === 'completed') {
      enrollment.completedAt = new Date();
      enrollment.progress.completionPercentage = 100;
    }

    await enrollment.save();

    res.json({
      success: true,
      message: `Enrollment statusi "${status}" ga yangilandi`,
      data: { enrollment }
    });

  } catch (err) {
    console.error('Update enrollment status error:', err);
    res.status(500).json({
      success: false,
      message: 'Statusni yangilashda xatolik: ' + err.message
    });
  }
};