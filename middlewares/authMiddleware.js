// middleware/authMiddleware.js - TO'G'RILANGAN
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const mongoose = require('mongoose');

const jwtSecret = process.env.JWT_SECRET;

// Asosiy token tekshirish middleware
exports.verifyToken = async (req, res, next) => {
  try {
    console.log('🔐 Auth middleware ishladi');
    
    const token = req.header('Authorization')?.replace('Bearer ', '');
    
    if (!token) {
      console.log('❌ Token topilmadi');
      return res.status(401).json({
        success: false,
        message: "Kirish tokeni talab qilinadi"
      });
    }

    const decoded = jwt.verify(token, jwtSecret);
    console.log('🔓 Token decoded:', decoded);
    
    // User ID ni tekshirish
    if (!decoded.id || !mongoose.Types.ObjectId.isValid(decoded.id)) {
      console.log('❌ Noto‘g‘ri user ID token da:', decoded.id);
      return res.status(401).json({
        success: false,
        message: "Yaroqsiz token"
      });
    }

    const user = await User.findById(decoded.id).select('-password');
    
    if (!user) {
      console.log('❌ User topilmadi ID:', decoded.id);
      return res.status(401).json({
        success: false,
        message: "Token yaroqsiz"
      });
    }

    if (!user.isActive) {
      return res.status(401).json({
        success: false,
        message: "Hisob aktivlashtirilmagan"
      });
    }

    console.log('✅ User topildi:', {
      id: user._id.toString(),
      role: user.role,
      email: user.email
    });

    // User ma'lumotlarini request ga qo'shish
    req.user = {
      id: user._id.toString(), // ID ni string formatida saqlaymiz
      role: user.role,
      email: user.email,
      name: user.name
    };

    next();
  } catch (err) {
    if (err.name === 'JsonWebTokenError') {
      return res.status(401).json({
        success: false,
        message: "Yaroqsiz token"
      });
    }
    if (err.name === 'TokenExpiredError') {
      return res.status(401).json({
        success: false,
        message: "Token muddati tugagan"
      });
    }
    
    console.error("Auth middleware error:", err);
    res.status(500).json({
      success: false,
      message: "Server xatosi"
    });
  }
};

// ... qolgan middleware lar o'zgarmaydi
exports.verifyAdmin = (req, res, next) => {
  if (!req.user || req.user.role !== 'admin') {
    return res.status(403).json({
      success: false,
      message: "Admin huquqi talab qilinadi"
    });
  }
  next();
};

exports.verifyTeacher = (req, res, next) => {
  if (!req.user || (req.user.role !== 'teacher' && req.user.role !== 'admin')) {
    return res.status(403).json({
      success: false,
      message: "Teacher yoki admin huquqi talab qilinadi"
    });
  }
  next();
};

exports.requireRole = (roles = []) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'Avtorizatsiya talab qilinadi'
      });
    }

    if (roles.length && !roles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: 'Sizda ruxsat yoʻq'
      });
    }

    next();
  };
};

exports.verifyStudent = (req, res, next) => {
  if (!req.user || (req.user.role !== 'student' && req.user.role !== 'admin')) {
    return res.status(403).json({
      success: false,
      message: "Student yoki admin huquqi talab qilinadi"
    });
  }
  next();
};