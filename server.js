// server.js
require('dotenv').config();
const express = require('express');
const path = require('path');
const connectDB = require('./config/db');
const listEndpoints = require('express-list-endpoints');
const morgan = require('morgan');
const helmet = require('helmet');
const mongoSanitize = require('express-mongo-sanitize');
const xss = require('xss-clean');
const rateLimit = require('express-rate-limit');
const cors = require('cors');
const swaggerUi = require('swagger-ui-express');
const swaggerFile = require('./swagger-output.json');

const app = express();
const PORT = process.env.PORT || 5000;

// ✅ MongoDB bilan ulanish
if (!process.env.MONGO_URI) {
  console.error('❌ ERROR: MONGO_URI .env faylda mavjud emas!');
  process.exit(1);
}
connectDB(process.env.MONGO_URI);

// ✅ Middlewares
app.use(morgan('dev'));           // request log
app.use(helmet());                // HTTP header xavfsizligi
app.use(mongoSanitize());         // Mongo injection himoya
app.use(xss());                   // XSS himoya

// CORS - Development va Production uchun
if (process.env.NODE_ENV === 'production') {
  app.use(cors({
    origin: ['https://your-production-domain.com'],
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE',
    credentials: true
  }));
} else {
  app.use(cors({
    origin: 'http://localhost:5173',
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE',
    credentials: true
  }));
}

// JSON body parsing
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Rate limiting
const generalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 daqiqa
  max: 220,
  message: { message: 'Juda ko‘p so‘rovlar; keyinroq urinib ko‘ring.' },
  standardHeaders: true,
  legacyHeaders: false
});
app.use('/api', generalLimiter);

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 daqiqa
  max: 10,
  message: { message: 'Juda ko‘p autentifikatsiya urinishlari. Keyinroq urinib ko‘ring.' },
  standardHeaders: true,
  legacyHeaders: false
});
app.use('/api/auth', authLimiter);

// ✅ Static files
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));
app.use('/certs', express.static(path.join(__dirname, 'certs')));

// ✅ Routes
app.use('/api/auth', require('./routes/authRoutes'));
app.use('/api/courses', require('./routes/courseRoutes'));
app.use('/api/modules',require('./routes/moduleRoutes'));
app.use('/api/lessons', require('./routes/lessonRoutes'));
app.use('/api/tests', require('./routes/testRoutes'));
app.use('/api/progress', require('./routes/progressRoutes'));
app.use('/api/certificates', require('./routes/certificateRoutes'));
app.use('/api/achievements', require('./routes/achievementRoutes'));
app.use('/api/users', require('./routes/userRoutes'));

// ✅ Swagger UI
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerFile));

// ✅ Health check endpoint
app.get('/health', (req, res) => {
  res.status(200).json({ 
    status: 'OK', 
    timestamp: new Date().toISOString(),
    uptime: process.uptime()
  });
});

// ✅ Root endpoint
app.get('/', (req, res) => {
  res.json({ 
    message: 'LMS service ishlamoqda 🚀',
    version: '1.0.0',
    documentation: '/api-docs'
  });
});

// ✅ 404 handler
app.use((req, res, next) => {
  res.status(404).json({ 
    message: 'Sahifa topilmadi',
    path: req.path,
    method: req.method 
  });
});

// ✅ Global error handler
app.use((err, req, res, next) => {
  console.error('❌ Xatolik:', err.stack);
  
  // Mongoose validation xatoligi
  if (err.name === 'ValidationError') {
    const errors = Object.values(err.errors).map(e => e.message);
    return res.status(400).json({ 
      message: 'Maʼlumotlar validatsiyasida xatolik',
      errors 
    });
  }
  
  // Mongoose duplicate key xatoligi
  if (err.code === 11000) {
    const field = Object.keys(err.keyValue)[0];
    return res.status(400).json({ 
      message: `${field} allaqachon mavjud` 
    });
  }
  
  // JWT xatoliklari
  if (err.name === 'JsonWebTokenError') {
    return res.status(401).json({ message: 'Yaroqsiz token' });
  }
  
  if (err.name === 'TokenExpiredError') {
    return res.status(401).json({ message: 'Token muddati tugagan' });
  }

  // Standart server xatoligi
  res.status(err.status || 500).json({
    message: process.env.NODE_ENV === 'production' 
      ? 'Ichki server xatoligi' 
      : err.message,
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
  });
});

// ✅ Process termination handlers
process.on('unhandledRejection', (err, promise) => {
  console.error('❌ Tutib olinmagan rad etilish:', err);
  // Serverni yopish
  process.exit(1);
});

process.on('uncaughtException', (err) => {
  console.error('❌ Tutib olinmagan istisno:', err);
  process.exit(1);
});

// ✅ Graceful shutdown
const gracefulShutdown = (signal) => {
  console.log(`\n📢 ${signal} signal received: closing HTTP server`);
  server.close(() => {
    console.log('✅ HTTP server closed');
    process.exit(0);
  });
};

process.on('SIGINT', () => gracefulShutdown('SIGINT'));
process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));

// ✅ Serverni ishga tushirish
const server = app.listen(PORT, () => {
  console.log(`\n🚀 Server ${PORT}-porta ishlayapti`);
  console.log(`📍 Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`📖 API Documentation: http://localhost:${PORT}/api-docs`);
  console.log(`❤️  Health Check: http://localhost:${PORT}/health`);
  console.log('\n📌 Available endpoints:');
  
  const endpoints = listEndpoints(app);
  endpoints.forEach(endpoint => {
    if (endpoint.path !== '/') {
      console.log(`   ${endpoint.methods.join(', ').padEnd(10)} ${endpoint.path}`);
    }
  });
});

module.exports = app;