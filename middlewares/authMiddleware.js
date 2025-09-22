const jwt = require('jsonwebtoken');

// Asosiy auth middleware
// Asosiy auth middleware (funksiya sifatida)
const authMiddleware = (roles = []) => {
  return (req, res, next) => {
    try {
      const authHeader = req.headers.authorization;
      if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({ message: 'Token topilmadi' });
      }

      const token = authHeader.split(' ')[1];
      const decoded = jwt.verify(token, process.env.JWT_SECRET);

      req.user = decoded;

      // Role tekshirish
      if (roles.length && !roles.includes(decoded.role)) {
        return res.status(403).json({ message: 'Sizda ruxsat yo‘q' });
      }

      next();
    } catch (err) {
      if (err.name === 'TokenExpiredError') {
        return res.status(401).json({ message: 'Token muddati tugagan' });
      }
      return res.status(401).json({ message: 'Token yaroqsiz' });
    }
  };
};


// Admin tekshiruvi uchun middleware
const verifyAdmin = (req, res, next) => {
  if (!req.user || req.user.role !== 'admin') {
    return res.status(403).json({ message: 'Admin huquqi talab qilinadi' });
  }
  next();
};

// Role asosida tekshirish
const requireRole = (roles = []) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ message: 'Avtorizatsiya talab qilinadi' });
    }

    if (roles.length && !roles.includes(req.user.role)) {
      return res.status(403).json({ message: 'Sizda ruxsat yoʻq' });
    }

    next();
  };
};

// ✅ To‘g‘ri eksport qilamiz
module.exports = {
  authMiddleware,
  verifyAdmin,
  requireRole
};
