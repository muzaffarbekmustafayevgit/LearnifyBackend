// controllers/userController.js
const User = require('../models/User');
const bcrypt = require('bcryptjs');
const mongoose = require('mongoose');

// GET all users (admin only)
const getUsers = async (req, res) => {
  try {
    const { page = 1, limit = 10, role, search } = req.query;
    
    const query = {};
    if (role) query.role = role;
    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } }
      ];
    }

    const users = await User.find(query)
      .select('-password -refreshToken')
      .limit(limit * 1)
      .skip((page - 1) * limit)
      .sort({ createdAt: -1 });

    const total = await User.countDocuments(query);

    res.status(200).json({
      users,
      totalPages: Math.ceil(total / limit),
      currentPage: page,
      total
    });
  } catch (err) {
    res.status(500).json({ message: 'Foydalanuvchilarni olishda xato', error: err.message });
  }
};

// GET user by ID
const getUserById = async (req, res) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).json({ message: 'Noto‘g‘ri ID formati' });
    }

    const user = await User.findById(req.params.id)
      .select('-password -refreshToken')
      .populate('enrolledCourses.course', 'title thumbnail')
      .populate('createdCourses', 'title thumbnail');

    if (!user) return res.status(404).json({ message: 'Foydalanuvchi topilmadi' });
    
    res.status(200).json(user);
  } catch (err) {
    res.status(500).json({ message: 'Foydalanuvchini olishda xato', error: err.message });
  }
};

// CREATE user (admin only)
const createUser = async (req, res) => {
  try {
    const { name, email, password, role, subject, faculty, experienceYears, phone, bio } = req.body;

    // Validatsiya
    if (!name || !email || !password) {
      return res.status(400).json({ message: 'Name, email va password talab qilinadi' });
    }

    const existingUser = await User.findOne({ email });
    if (existingUser) return res.status(400).json({ message: 'Email allaqachon mavjud' });

    const hashedPassword = await bcrypt.hash(password, 12);

    const newUser = new User({
      name,
      email: email.toLowerCase(),
      password: hashedPassword,
      role: role || 'student',
      subject: role === 'teacher' ? subject : undefined,
      faculty: role === 'teacher' ? faculty : undefined,
      experienceYears: role === 'teacher' ? parseInt(experienceYears) || 0 : 0,
      phone,
      bio,
      isActive: true // Admin tomonidan yaratilgan foydalanuvchi aktiv
    });

    await newUser.save();

    // Parolni olib tashlab javob qaytarish
    const userResponse = await User.findById(newUser._id).select('-password -refreshToken');
    
    res.status(201).json({ 
      message: 'Foydalanuvchi muvaffaqiyatli yaratildi', 
      user: userResponse 
    });
  } catch (err) {
    if (err.code === 11000) {
      return res.status(400).json({ message: 'Email allaqachon mavjud' });
    }
    res.status(500).json({ message: 'Foydalanuvchi yaratishda xato', error: err.message });
  }
};

// UPDATE user (admin only)
const updateUser = async (req, res) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).json({ message: 'Noto‘g‘ri ID formati' });
    }

    const { name, email, password, role, subject, faculty, experienceYears, isActive, phone, bio } = req.body;

    const updateData = { 
      name, 
      email: email?.toLowerCase(), 
      role, 
      subject, 
      faculty, 
      experienceYears: parseInt(experienceYears) || 0,
      isActive,
      phone,
      bio 
    };

    // Faqat parol berilgan bo'lsa yangilash
    if (password && password.length >= 6) {
      updateData.password = await bcrypt.hash(password, 12);
    }

    const updatedUser = await User.findByIdAndUpdate(
      req.params.id, 
      updateData, 
      { new: true, runValidators: true }
    ).select('-password -refreshToken');

    if (!updatedUser) return res.status(404).json({ message: 'Foydalanuvchi topilmadi' });

    res.status(200).json({ 
      message: 'Foydalanuvchi muvaffaqiyatli yangilandi', 
      user: updatedUser 
    });
  } catch (err) {
    if (err.code === 11000) {
      return res.status(400).json({ message: 'Email allaqachon mavjud' });
    }
    res.status(500).json({ message: 'Foydalanuvchi yangilashda xato', error: err.message });
  }
};

// DELETE user (admin only) - SOFT DELETE
const deleteUser = async (req, res) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).json({ message: 'Noto‘g‘ri ID formati' });
    }

    // Soft delete - foydalanuvchini butunlay o'chirmaslik
    const deletedUser = await User.findByIdAndUpdate(
      req.params.id,
      { 
        isActive: false,
        email: `deleted_${Date.now()}_${req.params.id}@deleted.com`, // Emailni unique qilish
        refreshToken: null // Tokenlarni tozalash
      },
      { new: true }
    ).select('-password -refreshToken');

    if (!deletedUser) return res.status(404).json({ message: 'Foydalanuvchi topilmadi' });

    res.status(200).json({ 
      message: 'Foydalanuvchi muvaffaqiyatli o‘chirildi', 
      user: deletedUser 
    });
  } catch (err) {
    res.status(500).json({ message: 'Foydalanuvchi o‘chirishda xato', error: err.message });
  }
};

// GET user profile (own profile)
const getProfile = async (req, res) => {
  try {
    const user = await User.findById(req.user.id)
      .select('-password -refreshToken')
      .populate('enrolledCourses.course', 'title thumbnail teacher')
      .populate('createdCourses', 'title thumbnail')
      .populate('completedLessons.lesson', 'title type');

    if (!user) return res.status(404).json({ message: 'Foydalanuvchi topilmadi' });
    
    res.status(200).json(user);
  } catch (err) {
    res.status(500).json({ message: 'Profilni olishda xato', error: err.message });
  }
};

// UPDATE user profile (own profile)
const updateProfile = async (req, res) => {
  try {
    const { name, phone, bio, avatar, preferences } = req.body;

    const updateData = { name, phone, bio, avatar };
    if (preferences) updateData.preferences = preferences;

    const updatedUser = await User.findByIdAndUpdate(
      req.user.id, 
      updateData, 
      { new: true, runValidators: true }
    ).select('-password -refreshToken');

    res.status(200).json({ 
      message: 'Profil muvaffaqiyatli yangilandi', 
      user: updatedUser 
    });
  } catch (err) {
    res.status(500).json({ message: 'Profil yangilashda xato', error: err.message });
  }
};

module.exports = {
  getUsers,
  getUserById,
  createUser,
  updateUser,
  deleteUser,
  getProfile,
  updateProfile
};