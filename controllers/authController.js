const { validationResult } = require('express-validator');
const generateToken = require('../utils/generateToken');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const nodemailer = require('nodemailer');
const User = require('../models/User');

const jwtSecret = process.env.JWT_SECRET;
const jwtExpiresIn = process.env.JWT_EXPIRES_IN || '7d';

// REGISTER
exports.register = async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  const { name, email, password, role, subject, faculty, experienceYears } = req.body;

  try {
    let user = await User.findOne({ email });
    if (user) {
      return res.status(409).json({ message: 'Email allaqachon ro\'yxatdan o\'tgan' });
    }

    const saltRounds = 10;
    const hashed = await bcrypt.hash(password, saltRounds);

    // 6 xonali kod
    const activationCode = Math.floor(100000 + Math.random() * 900000).toString();
    const activationExpires = Date.now() + 15 * 60 * 1000; // 15 daqiqa

    user = new User({
      name,
      email,
      password: hashed,
      role,
      activationCode,
      activationExpires,
      subject: role === 'teacher' ? subject : undefined,
      faculty: role === 'teacher' ? faculty : undefined,
      experienceYears: role === 'teacher' ? experienceYears : undefined
    });
    await user.save();

    // Email yuborish
    const transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS
      }
    });

    await transporter.sendMail({
      from: `"Learnify" <${process.env.EMAIL_USER}>`,
      to: email,
      subject: "Email tasdiqlash kodi",
      text: `Sizning tasdiqlash kodingiz: ${activationCode}`,
    });

    return res.status(201).json({
      message: 'Ro\'yxatdan o\'tish muvaffaqiyatli. Email tasdiqlang.',
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        subject: user.subject,
        faculty: user.faculty,
        experienceYears: user.experienceYears
      }
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: 'Serverda xatolik yuz berdi' });
  }
};

// ACTIVATE
exports.activate = async (req, res) => {
  const { email, code } = req.body;

  try {
    const user = await User.findOne({ email });
    if (!user) return res.status(404).json({ message: 'Foydalanuvchi topilmadi' });

    if (user.isActive) {
      return res.status(400).json({ message: 'Email allaqachon tasdiqlangan' });
    }

    if (user.activationCode !== code || user.activationExpires < Date.now()) {
      return res.status(400).json({ message: 'Kod noto\'g\'ri yoki muddati o\'tgan' });
    }

    user.isActive = true;
    user.activationCode = undefined;
    user.activationExpires = undefined;
    await user.save();

    return res.json({ message: 'Email muvaffaqiyatli tasdiqlandi' });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: 'Serverda xatolik yuz berdi' });
  }
};


exports.login = async (req, res) => {
  const { email, password } = req.body;

  try {
    const user = await User.findOne({ email });
    if (!user) return res.status(404).json({ message: 'Foydalanuvchi topilmadi' });

    if (!user.isActive) {
      return res.status(400).json({ message: 'Email hali tasdiqlanmagan' });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) return res.status(400).json({ message: 'Parol noto‘g‘ri' });

    // 🔑 Token generatsiya qilish
    const token = generateToken(user);

    res.json({
      message: 'Login muvaffaqiyatli',
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role
      }
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Serverda xatolik yuz berdi' });
  }
};
exports.logout = async (req, res) => {
  const { refreshToken } = req.body;

  if (!refreshToken) return res.status(400).json({ message: 'Refresh token kerak' });

  try {
    const user = await User.findOne({ refreshToken });
    if (!user) {
      return res.status(400).json({ message: 'Bunday refresh token topilmadi' });
    }

    // 🔑 refreshToken’ni tozalaymiz
    user.refreshToken = null;
    await user.save();

    res.json({ message: 'Logout muvaffaqiyatli bajarildi' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Serverda xatolik yuz berdi' });
  }
};


// Profilni olish
exports.getProfile = async (req, res) => {
  try {
    // authMiddleware orqali kelgan foydalanuvchi ID ni olish
    const user = await User.findById(req.user.id).select("-password"); 
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }
    res.json(user);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};