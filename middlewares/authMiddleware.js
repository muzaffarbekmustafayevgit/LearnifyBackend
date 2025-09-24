// middleware/authMiddleware.js
const jwt = require('jsonwebtoken');
const User = require('../models/User');

const jwtSecret = process.env.JWT_SECRET;

// Asosiy token tekshirish middleware
exports.verifyToken = async (req, res, next) => {
  try {
    const token = req.header('Authorization')?.replace('Bearer ', '');
    
    if (!token) {
      return res.status(401).json({
        success: false,
        message: "Kirish tokeni talab qilinadi"
      });
    }

    const decoded = jwt.verify(token, jwtSecret);
    const user = await User.findById(decoded.id).select('-password');
    
    if (!user) {
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

    req.user = user;
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

// Admin uchun middleware
exports.verifyAdmin = (req, res, next) => {
  if (!req.user || req.user.role !== 'admin') {
    return res.status(403).json({
      success: false,
      message: "Admin huquqi talab qilinadi"
    });
  }
  next();
};

// Teacher uchun middleware
exports.verifyTeacher = (req, res, next) => {
  if (!req.user || (req.user.role !== 'teacher' && req.user.role !== 'admin')) {
    return res.status(403).json({
      success: false,
      message: "Teacher yoki admin huquqi talab qilinadi"
    });
  }
  next();
};

// Role asosida tekshirish (universal)
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

// Student uchun qisqa middleware
exports.verifyStudent = (req, res, next) => {
  if (!req.user || (req.user.role !== 'student' && req.user.role !== 'admin')) {
    return res.status(403).json({
      success: false,
      message: "Student yoki admin huquqi talab qilinadi"
    });
  }
  next();
};