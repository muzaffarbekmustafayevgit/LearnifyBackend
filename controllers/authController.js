const { validationResult } = require("express-validator");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const nodemailer = require("nodemailer");
const User = require("../models/User");

const jwtSecret = process.env.JWT_SECRET;
const accessTokenExpiresIn = "15m";   // Access token qisqa muddat
const refreshTokenExpiresIn = "7d";   // Refresh token uzoq muddat

// 🔑 Token generatorlari
const generateAccessToken = (user) => {
  return jwt.sign(
    { id: user._id, role: user.role },
    jwtSecret,
    { expiresIn: accessTokenExpiresIn }
  );
};

const generateRefreshToken = (user) => {
  return jwt.sign(
    { id: user._id, role: user.role },
    jwtSecret,
    { expiresIn: refreshTokenExpiresIn }
  );
};

// ================== REGISTER ==================
exports.register = async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  const { name, email, password, role, subject, faculty, experienceYears } = req.body;

  try {
    let user = await User.findOne({ email });
    if (user) return res.status(409).json({ message: "Email allaqachon ro‘yxatdan o‘tgan" });

    const hashed = await bcrypt.hash(password, 10);
    const activationCode = Math.floor(100000 + Math.random() * 900000).toString();
    const activationExpires = Date.now() + 15 * 60 * 1000;

    user = new User({
      name,
      email,
      password: hashed,
      role: role || "student",
      activationCode,
      activationExpires,
      subject: role === "teacher" ? subject : undefined,
      faculty: role === "teacher" ? faculty : undefined,
      experienceYears: role === "teacher" ? Number(experienceYears) || 0 : 0
    });

    await user.save();

    // Email yuborish
    const transporter = nodemailer.createTransport({
      service: "gmail",
      auth: { user: process.env.EMAIL_USER, pass: process.env.EMAIL_PASS }
    });

    await transporter.sendMail({
      from: `"Learnify" <${process.env.EMAIL_USER}>`,
      to: email,
      subject: "Email tasdiqlash kodi",
      text: `Assalomu alaykum ${name},\n\nTasdiqlash kodingiz: ${activationCode}\n\nKod 15 daqiqa amal qiladi.`
    });

    return res.status(201).json({
      message: "Ro‘yxatdan o‘tish muvaffaqiyatli. Email tasdiqlang.",
      user: { id: user._id, name: user.name, email: user.email, role: user.role }
    });
  } catch (err) {
    console.error("Register error:", err.message);
    res.status(500).json({ message: "Serverda xatolik yuz berdi" });
  }
};

// ================== ACTIVATE ==================
exports.activate = async (req, res) => {
  const { email, code } = req.body;
  try {
    const user = await User.findOne({ email });
    if (!user) return res.status(404).json({ message: "Foydalanuvchi topilmadi" });
    if (user.isActive) return res.status(400).json({ message: "Email allaqachon tasdiqlangan" });

    if (user.activationCode !== code || user.activationExpires < Date.now()) {
      return res.status(400).json({ message: "Kod noto‘g‘ri yoki muddati o‘tgan" });
    }

    user.isActive = true;
    user.activationCode = undefined;
    user.activationExpires = undefined;
    await user.save();

    return res.json({ message: "Email muvaffaqiyatli tasdiqlandi" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Serverda xatolik yuz berdi" });
  }
};

// ================== LOGIN ==================
exports.login = async (req, res) => {
  const { email, password } = req.body;
  try {
    const user = await User.findOne({ email });
    if (!user) return res.status(404).json({ message: "Foydalanuvchi topilmadi" });
    if (!user.isActive) return res.status(400).json({ message: "Email hali tasdiqlanmagan" });

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) return res.status(400).json({ message: "Parol noto‘g‘ri" });

    // Tokenlar yaratish
    const accessToken = generateAccessToken(user);
    const refreshToken = generateRefreshToken(user);

    // Refresh tokenni DBga saqlash
    user.refreshToken = refreshToken;
    await user.save();

    res.json({
      message: "Login muvaffaqiyatli",
      accessToken,
      refreshToken,
      user: { id: user._id, name: user.name, email: user.email, role: user.role }
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Serverda xatolik yuz berdi" });
  }
};

// ================== REFRESH TOKEN ==================
exports.refresh = async (req, res) => {
  const { refreshToken } = req.body;
  if (!refreshToken) return res.status(400).json({ message: "Refresh token kerak" });

  try {
    const user = await User.findOne({ refreshToken });
    if (!user) return res.status(403).json({ message: "Refresh token noto‘g‘ri" });

    jwt.verify(refreshToken, jwtSecret, (err, decoded) => {
      if (err) return res.status(403).json({ message: "Refresh token muddati tugagan" });

      const newAccessToken = generateAccessToken(user);
      const newRefreshToken = generateRefreshToken(user);

      user.refreshToken = newRefreshToken;
      user.save();

      res.json({
        accessToken: newAccessToken,
        refreshToken: newRefreshToken
      });
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Serverda xatolik yuz berdi" });
  }
};

// ================== LOGOUT ==================
exports.logout = async (req, res) => {
  const { refreshToken } = req.body;
  if (!refreshToken) return res.status(400).json({ message: "Refresh token kerak" });

  try {
    const user = await User.findOne({ refreshToken });
    if (!user) return res.status(400).json({ message: "Bunday refresh token topilmadi" });

    user.refreshToken = null;
    await user.save();

    res.json({ message: "Logout muvaffaqiyatli bajarildi" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Serverda xatolik yuz berdi" });
  }
};

// ================== PROFILE ==================
exports.getProfile = async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select("-password -refreshToken");
    if (!user) return res.status(404).json({ message: "User not found" });

    res.json(user);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
