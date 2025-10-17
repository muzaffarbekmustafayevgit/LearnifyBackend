const { validationResult } = require("express-validator");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const nodemailer = require("nodemailer");
const User = require("../models/User");

const jwtSecret = process.env.JWT_SECRET;
const accessTokenExpiresIn = "15m";
const refreshTokenExpiresIn = "7d";

// 🔑 Token generatorlari
const generateAccessToken = (user) => {
  return jwt.sign(
    { id: user._id, role: user.role, email: user.email },
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

// ✅ TO'G'RILANGAN: Email transporter
const createTransporter = () => {
  return nodemailer.createTransport({ // <- createTransport deb o'zgartirildi
    service: "gmail",
    auth: { 
      user: process.env.EMAIL_USER, 
      pass: process.env.EMAIL_PASS 
    }
  });
};
// ================== REGISTER ==================
exports.register = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { name, email, password, role, subject, faculty, experienceYears } = req.body;

    // Email mavjudligini tekshirish
    const existingUser = await User.findOne({ email: email.toLowerCase() });
    if (existingUser) {
      return res.status(409).json({ message: "Email allaqachon ro'yxatdan o'tgan" });
    }

    // Parolni hash qilish
    const hashedPassword = await bcrypt.hash(password, 12);
    
    // Aktivatsiya kodi
    const activationCode = Math.floor(100000 + Math.random() * 900000).toString();
    const activationExpires = new Date(Date.now() + 15 * 60 * 1000); // 15 daqiqa

    // Yangi foydalanuvchi yaratish
    const user = new User({
      name: name.trim(),
      email: email.toLowerCase(),
      password: hashedPassword,
      role: role || "student",
      activationCode,
      activationExpires,
      ...(role === "teacher" && {
        subject: subject?.trim(),
        faculty: faculty?.trim(),
        experienceYears: parseInt(experienceYears) || 0
      })
    });

    await user.save();

    // Email yuborish
    try {
      const transporter = createTransporter();
      await transporter.sendMail({
        from: `"Learnify Platform" <${process.env.EMAIL_USER}>`,
        to: email,
        subject: "Email tasdiqlash kodi - Learnify",
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2 style="color: #4F46E5;">Learnify Platform</h2>
            <p>Assalomu alaykum <strong>${name}</strong>,</p>
            <p>Ro'yxatdan o'tish uchun tasdiqlash kodingiz:</p>
            <div style="background: #f5f5f5; padding: 20px; text-align: center; font-size: 24px; letter-spacing: 5px; margin: 20px 0;">
              <strong>${activationCode}</strong>
            </div>
            <p>Bu kod <strong>15 daqiqa</strong> amal qiladi.</p>
            <p>Agar siz ro'yxatdan o'tmagan bo'lsangiz, ushbu xabarni e'tiborsiz qoldiring.</p>
          </div>
        `
      });
      console.log('✅ Aktivatsiya kodi emailga yuborildi');
    } catch (emailError) {
      console.error('❌ Email yuborishda xato:', emailError);
      // Email xatosini foydalanuvchiga ko'rsatmaslik, lekin log qilish
    }

    res.status(201).json({
      success: true,
      message: "Ro'yxatdan o'tish muvaffaqiyatli. Emailingizni tekshiring.",
      data: { 
        id: user._id, 
        name: user.name, 
        email: user.email, 
        role: user.role 
      }
    });

  } catch (err) {
    console.error("❌ Register error:", err);
    res.status(500).json({ 
      success: false,
      message: "Server xatosi. Iltimos keyinroq urunib ko'ring.",
      error: process.env.NODE_ENV === 'development' ? err.message : undefined
    });
  }
};


// ================== ACTIVATE ACCOUNT ==================
exports.activate = async (req, res) => {
  try {
    const { email, code } = req.body;

    if (!email || !code) {
      return res.status(400).json({ 
        success: false,
        message: "Email va kod talab qilinadi" 
      });
    }

    const user = await User.findOne({ email: email.toLowerCase() });
    if (!user) {
      return res.status(404).json({ 
        success: false,
        message: "Foydalanuvchi topilmadi" 
      });
    }

    if (user.isActive) {
      return res.status(400).json({ 
        success: false,
        message: "Hisob allaqachon aktivlashtirilgan" 
      });
    }

    // Kodni tekshirish
    if (user.activationCode !== code) {
      return res.status(400).json({ 
        success: false,
        message: "Noto'g'ri tasdiqlash kodi" 
      });
    }

    // Kod muddatini tekshirish
    if (user.activationExpires < new Date()) {
      return res.status(400).json({ 
        success: false,
        message: "Tasdiqlash kodi muddati o'tgan" 
      });
    }

    // Hisobni aktivlashtirish
    user.isActive = true;
    user.activationCode = undefined;
    user.activationExpires = undefined;
    await user.save();

    // Tokenlar yaratish
    const accessToken = generateAccessToken(user);
    const refreshToken = generateRefreshToken(user);

    // Refresh tokenni saqlash
    user.refreshToken = refreshToken;
    await user.save();

    res.json({
      success: true,
      message: "Hisob muvaffaqiyatli aktivlashtirildi",
      data: {
        accessToken,
        refreshToken,
        user: {
          id: user._id,
          name: user.name,
          email: user.email,
          role: user.role
        }
      }
    });

  } catch (err) {
    console.error("Activation error:", err);
    res.status(500).json({ 
      success: false,
      message: "Server xatosi" 
    });
  }
};

// ================== LOGIN ==================
exports.login = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ 
        success: false,
        message: "Email va parol talab qilinadi" 
      });
    }

    const user = await User.findOne({ email: email.toLowerCase() });
    if (!user) {
      return res.status(401).json({ 
        success: false,
        message: "Email yoki parol noto'g'ri" 
      });
    }

    if (!user.isActive) {
      return res.status(401).json({ 
        success: false,
        message: "Hisob aktivlashtirilmagan. Iltimos emailingizni tekshiring." 
      });
    }

    // Parolni tekshirish
    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      return res.status(401).json({ 
        success: false,
        message: "Email yoki parol noto'g'ri" 
      });
    }

    // Tokenlar yaratish
    const accessToken = generateAccessToken(user);
    const refreshToken = generateRefreshToken(user);

    // Refresh tokenni yangilash
    user.refreshToken = refreshToken;
    user.lastLogin = new Date();
    user.save().catch(err => console.error("User save error:", err));


    res.json({
      success: true,
      message: "Kirish muvaffaqiyatli",
      data: {
        accessToken,
        refreshToken,
        user: {
          id: user._id,
          name: user.name,
          email: user.email,
          role: user.role,
          avatar: user.avatar,
          points: user.points,
          rank: user.rank
        }
      }
    });

  } catch (err) {
    console.error("Login error:", err);
    res.status(500).json({ 
      success: false,
      message: "Server xatosi" 
    });
  }
};

// ================== REFRESH TOKEN ==================
exports.refreshToken = async (req, res) => {
  try {
    const { refreshToken } = req.body;

    if (!refreshToken) {
      return res.status(400).json({ 
        success: false,
        message: "Refresh token talab qilinadi" 
      });
    }

    // Tokenni tekshirish
    const decoded = jwt.verify(refreshToken, jwtSecret);
    const user = await User.findById(decoded.id);

    if (!user || user.refreshToken !== refreshToken) {
      return res.status(403).json({ 
        success: false,
        message: "Yaroqsiz refresh token" 
      });
    }

    // Yangi tokenlar yaratish
    const newAccessToken = generateAccessToken(user);
    const newRefreshToken = generateRefreshToken(user);

    // Yangi refresh tokenni saqlash
    user.refreshToken = newRefreshToken;
    await user.save();

    res.json({
      success: true,
      data: {
        accessToken: newAccessToken,
        refreshToken: newRefreshToken
      }
    });

  } catch (err) {
    if (err.name === 'JsonWebTokenError') {
      return res.status(403).json({ 
        success: false,
        message: "Yaroqsiz token" 
      });
    }
    if (err.name === 'TokenExpiredError') {
      return res.status(403).json({ 
        success: false,
        message: "Token muddati tugagan" 
      });
    }
    
    console.error("Refresh token error:", err);
    res.status(500).json({ 
      success: false,
      message: "Server xatosi" 
    });
  }
};

// ================== LOGOUT ==================
exports.logout = async (req, res) => {
  try {
    const { refreshToken } = req.body;

    if (!refreshToken) {
      return res.status(400).json({ 
        success: false,
        message: "Refresh token talab qilinadi" 
      });
    }

    const user = await User.findOne({ refreshToken });
    if (user) {
      user.refreshToken = undefined;
      await user.save();
    }

    res.json({
      success: true,
      message: "Chiqish muvaffaqiyatli amalga oshirildi"
    });

  } catch (err) {
    console.error("Logout error:", err);
    res.status(500).json({ 
      success: false,
      message: "Server xatosi" 
    });
  }
};

// ================== FORGOT PASSWORD ==================
exports.forgotPassword = async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({ 
        success: false,
        message: "Email talab qilinadi" 
      });
    }

    const user = await User.findOne({ email: email.toLowerCase() });
    if (!user) {
      return res.json({
        success: true,
        message: "Agar email topilsa, parolni tiklash ko'rsatmalari yuborildi"
      });
    }

    // Parolni tiklash tokeni yaratish
    const resetToken = jwt.sign(
      { id: user._id, purpose: 'password_reset' },
      jwtSecret,
      { expiresIn: '1h' }
    );

    user.resetPasswordToken = resetToken;
    user.resetPasswordExpires = new Date(Date.now() + 60 * 60 * 1000); // 1 soat
    await user.save();

    // Email yuborish
    try {
      const transporter = createTransporter();
      const resetUrl = `${process.env.CLIENT_URL}/reset-password?token=${resetToken}`;

      await transporter.sendMail({
        from: `"Learnify Platform" <${process.env.EMAIL_USER}>`,
        to: email,
        subject: "Parolni tiklash - Learnify",
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2 style="color: #4F46E5;">Parolni tiklash</h2>
            <p>Assalomu alaykum <strong>${user.name}</strong>,</p>
            <p>Parolingizni tiklash uchun quyidagi havolaga bosing:</p>
            <a href="${resetUrl}" style="background: #4F46E5; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px; display: inline-block; margin: 20px 0;">
              Parolni tiklash
            </a>
            <p>Havola 1 soat amal qiladi.</p>
            <p>Agar siz parolni tiklash so'rovini yubormagan bo'lsangiz, ushbu xabarni e'tiborsiz qoldiring.</p>
          </div>
        `
      });
    } catch (emailError) {
      console.error('Password reset email error:', emailError);
    }

    res.json({
      success: true,
      message: "Parolni tiklash ko'rsatmalari emailingizga yuborildi"
    });

  } catch (err) {
    console.error("Forgot password error:", err);
    res.status(500).json({ 
      success: false,
      message: "Server xatosi" 
    });
  }
};

// ================== RESET PASSWORD ==================
exports.resetPassword = async (req, res) => {
  try {
    const { token, newPassword } = req.body;

    if (!token || !newPassword) {
      return res.status(400).json({ 
        success: false,
        message: "Token va yangi parol talab qilinadi" 
      });
    }

    if (newPassword.length < 6) {
      return res.status(400).json({ 
        success: false,
        message: "Parol kamida 6 ta belgidan iborat bo'lishi kerak" 
      });
    }

    // Tokenni tekshirish
    const decoded = jwt.verify(token, jwtSecret);
    if (decoded.purpose !== 'password_reset') {
      return res.status(400).json({ 
        success: false,
        message: "Yaroqsiz token" 
      });
    }

    const user = await User.findOne({
      _id: decoded.id,
      resetPasswordToken: token,
      resetPasswordExpires: { $gt: new Date() }
    });

    if (!user) {
      return res.status(400).json({ 
        success: false,
        message: "Yaroqsiz yoki muddati o'tgan token" 
      });
    }

    // Yangi parolni saqlash
    user.password = await bcrypt.hash(newPassword, 12);
    user.resetPasswordToken = undefined;
    user.resetPasswordExpires = undefined;
    await user.save();

    res.json({
      success: true,
      message: "Parol muvaffaqiyatli yangilandi"
    });

  } catch (err) {
    if (err.name === 'JsonWebTokenError') {
      return res.status(400).json({ 
        success: false,
        message: "Yaroqsiz token" 
      });
    }
    if (err.name === 'TokenExpiredError') {
      return res.status(400).json({ 
        success: false,
        message: "Token muddati tugagan" 
      });
    }
    
    console.error("Reset password error:", err);
    res.status(500).json({ 
      success: false,
      message: "Server xatosi" 
    });
  }
};

// ================== GET CURRENT USER ==================
exports.getCurrentUser = async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select('-password -refreshToken');
    
    if (!user) {
      return res.status(404).json({
        success: false,
        message: "Foydalanuvchi topilmadi"
      });
    }

    res.json({
      success: true,
      data: { user }
    });

  } catch (err) {
    console.error("Get current user error:", err);
    res.status(500).json({
      success: false,
      message: "Server xatosi"
    });
  }
};

// ================== CHANGE PASSWORD ==================
exports.changePassword = async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;

    if (!currentPassword || !newPassword) {
      return res.status(400).json({
        success: false,
        message: "Joriy va yangi parol talab qilinadi"
      });
    }

    if (newPassword.length < 6) {
      return res.status(400).json({
        success: false,
        message: "Yangi parol kamida 6 ta belgidan iborat bo'lishi kerak"
      });
    }

    const user = await User.findById(req.user.id);
    
    // Joriy parolni tekshirish
    const isCurrentPasswordValid = await bcrypt.compare(currentPassword, user.password);
    if (!isCurrentPasswordValid) {
      return res.status(400).json({
        success: false,
        message: "Joriy parol noto'g'ri"
      });
    }

    // Yangi parolni saqlash
    user.password = await bcrypt.hash(newPassword, 12);
    await user.save();

    res.json({
      success: true,
      message: "Parol muvaffaqiyatli yangilandi"
    });

  } catch (err) {
    console.error("Change password error:", err);
    res.status(500).json({
      success: false,
      message: "Server xatosi"
    });
  }
};

// ================== UPDATE PROFILE ==================
exports.updateProfile = async (req, res) => {
  try {
    const { name, avatar, subject, faculty, experienceYears } = req.body;
    
    const updateData = {};
    
    if (name) updateData.name = name.trim();
    if (avatar) updateData.avatar = avatar;
    
    // Faqat teacherlar uchun
    if (req.user.role === 'teacher') {
      if (subject) updateData.subject = subject.trim();
      if (faculty) updateData.faculty = faculty.trim();
      if (experienceYears) updateData.experienceYears = parseInt(experienceYears);
    }

    const user = await User.findByIdAndUpdate(
      req.user.id,
      { $set: updateData },
      { new: true, runValidators: true }
    ).select('-password -refreshToken');

    res.json({
      success: true,
      message: "Profil muvaffaqiyatli yangilandi",
      data: { user }
    });

  } catch (err) {
    console.error("Update profile error:", err);
    res.status(500).json({
      success: false,
      message: "Server xatosi"
    });
  }
};