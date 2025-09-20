const jwt = require('jsonwebtoken');

const authMiddleware = (roles = []) => {
  return (req, res, next) => {
    try {
      const authHeader = req.headers.authorization;
      if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({ message: 'Token topilmadi' });
      }

      const token = authHeader.split(' ')[1];
      const decoded = jwt.verify(token, process.env.JWT_SECRET);

      if (roles.length && !roles.includes(decoded.role)) {
        return res.status(403).json({ message: 'Sizda ruxsat yo‘q' });
      }

      req.user = { id: decoded.id, role: decoded.role };
      next();
    } catch (err) {
      console.error(err);

      if (err.name === 'TokenExpiredError') {
        return res.status(401).json({ message: 'Token muddati tugagan. Yangi token oling.' });
      }

      return res.status(401).json({ message: 'Token yaroqsiz' });
    }
  };
};

module.exports = authMiddleware;
