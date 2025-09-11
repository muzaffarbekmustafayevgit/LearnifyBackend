// controllers/authController.js
const { validationResult } = require('express-validator');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const User = require('../models/User');

const jwtSecret = process.env.JWT_SECRET;
const jwtExpiresIn = process.env.JWT_EXPIRES_IN || '7d';

exports.register = async (req, res) => {
  // validation result
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  const { name, email, password, role } = req.body;

  try {
    // foydalanuvchi bor-yo'qligini tekshirish
    let user = await User.findOne({ email });
    if (user) {
      return res.status(409).json({ message: 'Email allaqachon ro\'yxatdan o\'tgan' });
    }

    // parolni hash qilish
    const saltRounds = 10;
    const hashed = await bcrypt.hash(password, saltRounds);

    user = new User({ name, email, password: hashed, role });
    await user.save();

    // JWT yaratish
    const payload = { user: { id: user._id, role: user.role } };
    const token = jwt.sign(payload, jwtSecret, { expiresIn: jwtExpiresIn });

    return res.status(201).json({
      message: 'Ro\'yxatdan o\'tish muvaffaqiyatli',
      token,
      user: { id: user._id, name: user.name, email: user.email, role: user.role }
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: 'Serverda xatolik yuz berdi' });
  }
};

exports.login = async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  const { email, password } = req.body;

  try {
    const user = await User.findOne({ email });
    if (!user) {
      // don't leak which one is wrong for security best practice
      return res.status(401).json({ message: 'Email yoki parol noto\'g\'ri' });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(401).json({ message: 'Email yoki parol noto\'g\'ri' });
    }

    const payload = { user: { id: user._id, role: user.role } };
    const token = jwt.sign(payload, jwtSecret, { expiresIn: jwtExpiresIn });

    return res.json({
      message: 'Kirish muvaffaqiyatli',
      token,
      user: { id: user._id, name: user.name, email: user.email, role: user.role }
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: 'Serverda xatolik yuz berdi' });
  }
};
