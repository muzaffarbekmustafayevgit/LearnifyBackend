// controllers/userController.js
const User = require('../models/User');
const bcrypt = require('bcryptjs');

// GET all users (admin only)
const getUsers = async (req, res) => {
  try {
    const users = await User.find().select('-password');
    res.status(200).json(users);
  } catch (err) {
    res.status(500).json({ message: 'Foydalanuvchilarni olishda xato' });
  }
};

// GET user by ID
const getUserById = async (req, res) => {
  try {
    const user = await User.findById(req.params.id).select('-password');
    if (!user) return res.status(404).json({ message: 'Foydalanuvchi topilmadi' });
    res.status(200).json(user);
  } catch (err) {
    res.status(500).json({ message: 'Foydalanuvchini olishda xato' });
  }
};

// CREATE user (admin only)
const createUser = async (req, res) => {
  try {
    const { name, email, password, role, subject, faculty, experienceYears } = req.body;

    const existingUser = await User.findOne({ email });
    if (existingUser) return res.status(400).json({ message: 'Email allaqachon mavjud' });

    const hashedPassword = await bcrypt.hash(password, 10);

    const newUser = new User({
      name,
      email,
      password: hashedPassword,
      role,
      subject,
      faculty,
      experienceYears
    });

    await newUser.save();
    res.status(201).json({ message: 'Foydalanuvchi yaratildi', user: newUser });
  } catch (err) {
    res.status(500).json({ message: 'Foydalanuvchi yaratishda xato' });
  }
};

// UPDATE user (admin only)
const updateUser = async (req, res) => {
  try {
    const { name, email, password, role, subject, faculty, experienceYears, isActive } = req.body;

    const updateData = { name, email, role, subject, faculty, experienceYears, isActive };

    if (password) {
      updateData.password = await bcrypt.hash(password, 10);
    }

    const updatedUser = await User.findByIdAndUpdate(req.params.id, updateData, { new: true }).select('-password');
    if (!updatedUser) return res.status(404).json({ message: 'Foydalanuvchi topilmadi' });

    res.status(200).json({ message: 'Foydalanuvchi yangilandi', user: updatedUser });
  } catch (err) {
    res.status(500).json({ message: 'Foydalanuvchi yangilashda xato' });
  }
};

// DELETE user (admin only)
const deleteUser = async (req, res) => {
  try {
    const deletedUser = await User.findByIdAndDelete(req.params.id);
    if (!deletedUser) return res.status(404).json({ message: 'Foydalanuvchi topilmadi' });
    res.status(200).json({ message: 'Foydalanuvchi oʻchirildi' });
  } catch (err) {
    res.status(500).json({ message: 'Foydalanuvchi oʻchirishda xato' });
  }
};

module.exports = {
  getUsers,
  getUserById,
  createUser,
  updateUser,
  deleteUser
};