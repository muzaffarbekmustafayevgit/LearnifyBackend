// server.js
require('dotenv').config();
const express = require('express');
const path = require('path');
const fs = require('fs');
const connectDB = require('./config/db');
const helmet = require('helmet');
const mongoSanitize = require('express-mongo-sanitize');
const xss = require('xss-clean');
const rateLimit = require('express-rate-limit');
const cors = require('cors');
const swaggerUi = require('swagger-ui-express');

// ---------- CORS sozlamalari ----------
const corsOrigins = ["http://localhost:5173"];

const corsOptions = {
  origin: (origin, callback) => {
    if (!origin || corsOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error(`CORS: ${origin} domaini ruxsat etilmagan`));
    }
  },
  methods: "GET,HEAD,PUT,PATCH,POST,DELETE,OPTIONS",
  allowedHeaders: "Content-Type,Authorization,X-Requested-With,Accept,Origin,Cache-Control,Pragma",
  credentials: true,
  optionsSuccessStatus: 200
};

// ---------- App init ----------
const app = express();
const PORT = process.env.PORT || 5000;

// ---------- DB connect ----------
if (!process.env.MONGO_URI) {
  console.error('❌ ERROR: MONGO_URI .env faylda mavjud emas!');
  process.exit(1);
}
connectDB(process.env.MONGO_URI);

// ---------- Middlewares ----------
app.use(helmet());
app.use(mongoSanitize());
app.use(xss());
app.use(cors(corsOptions));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// ---------- Rate limits ----------
const generalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 220,
  message: { message: 'Juda ko‘p so‘rovlar; keyinroq urinib ko‘ring.' },
  standardHeaders: true,
  legacyHeaders: false
});
app.use('/api', generalLimiter);

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  message: { message: 'Juda ko‘p autentifikatsiya urinishlari. Keyinroq urinib ko‘ring.' },
  standardHeaders: true,
  legacyHeaders: false
});
app.use('/api/auth', authLimiter);

// ---------- Static directories ----------
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));
app.use('/public', express.static(path.join(__dirname, 'public')));

// ---------- Routes ----------
const routesDir = path.join(__dirname, 'Routes');

if (fs.existsSync(routesDir)) {
  console.log('✅ Routes papkasi topildi. Avtomatik yuklanmoqda...');
  
  const routeFiles = fs.readdirSync(routesDir).filter(f => f.endsWith('.js'));
  routeFiles.forEach(file => {
    const route = require(path.join(routesDir, file));
    const routeName = file.replace('Routes.js', '').toLowerCase();
    const prefix = `/api/${routeName}s`;
    app.use(prefix, route);
    console.log(`→ Route: ${prefix}`);
  });
} else {
  console.log('⚠️ Routes papkasi topilmadi. Qo‘lda routerlar chaqirilmoqda...');
app.use('/api/auth', require('./routes/authRoutes'));
app.use('/api/users', require('./routes/userRoutes'));
app.use('/api/courses', require('./routes/courseRoutes'));
app.use('/api/modules', require('./routes/moduleRoutes'));
app.use('/api/lessons', require('./routes/lessonRoutes'));
app.use('/api/enrollments', require('./routes/enrollmentRoutes'));
app.use('/api/progress', require('./routes/progressRoutes'));
app.use('/api/tests', require('./routes/testRoutes'));
app.use('/api/achievements', require('./routes/achievementRoutes'));
app.use('/api/certificates', require('./routes/certificateRoutes'));
}

const driveRoutesPath = path.join(__dirname, 'routes', 'driveRoutes.js');
console.log('🔍 Drive routes fayli:', driveRoutesPath);
console.log('📄 Fayl mavjud:', fs.existsSync(driveRoutesPath));

if (fs.existsSync(driveRoutesPath)) {
  try {
    const driveRoutes = require(driveRoutesPath);
    app.use('/api/drive', driveRoutes);
    console.log('✅ Drive routes muvaffaqiyatli qoʻshildi: /api/drive');
  } catch (error) {
    console.error('❌ Drive routes yuklanmadi:', error.message);
    console.error('❌ Xato tafsilotlari:', error.stack);
  }
} else {
  console.log('❌ Drive routes fayli topilmadi!');
  console.log('📁 Mavjud fayllar:');
  const routesDir = path.join(__dirname, 'routes');
  if (fs.existsSync(routesDir)) {
    const files = fs.readdirSync(routesDir);
    files.forEach(file => console.log('   -', file));
  }
}
// ---------- Swagger ----------
const swaggerFilePath = path.join(__dirname, 'swagger-output.json');
if (fs.existsSync(swaggerFilePath)) {
  const swaggerFile = require(swaggerFilePath);
  
  const swaggerOptions = {
    swaggerOptions: {
      persistAuthorization: true,
      displayRequestDuration: true,
      docExpansion: 'none'
    },
    customCss: '.swagger-ui .topbar { display: none }',
    customSiteTitle: "Learnify LMS API Documentation"
  };
  
  app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerFile, swaggerOptions));
  console.log('🧾 Swagger UI available at /api-docs');
}

// ---------- Health check ----------
app.get('/health', (req, res) => {
  res.status(200).json({
    status: 'OK',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    environment: process.env.NODE_ENV
  });
});

// ---------- Root endpoint ----------
app.get('/', (req, res) => {
  res.json({
    message: 'Learnify LMS Service ishlamoqda 🚀',
    version: '1.0.0',
    documentation: `${req.protocol}://${req.get('host')}/api-docs`
  });
});

// ---------- 404 handler ----------
app.use((req, res) => {
  res.status(404).json({
    message: 'Sahifa topilmadi',
    path: req.path,
    method: req.method
  });
});

// ---------- Global error handler ----------
app.use((err, req, res, next) => {
  console.error('❌ Xatolik:', err.message);

  if (err.message.includes('CORS')) {
    return res.status(403).json({ 
      message: err.message,
      allowedOrigins: corsOrigins 
    });
  }
  
  if (err.name === 'ValidationError') {
    const errors = Object.values(err.errors || {}).map(e => e.message);
    return res.status(400).json({ message: 'Maʼlumotlar validatsiyasida xatolik', errors });
  }
  
  if (err.code === 11000) {
    const field = Object.keys(err.keyValue || {})[0];
    return res.status(400).json({ message: `${field} allaqachon mavjud` });
  }
  
  if (err.name === 'JsonWebTokenError') {
    return res.status(401).json({ message: 'Yaroqsiz token' });
  }
  
  if (err.name === 'TokenExpiredError') {
    return res.status(401).json({ message: 'Token muddati tugagan' });
  }

  res.status(500).json({
    message: 'Ichki server xatoligi'
  });
});

// ---------- Server start ----------
const server = app.listen(PORT, () => {
  console.log(`\n🚀 Server ${PORT}-porta ishlayapti`);
  console.log(`📍 Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`📖 API Documentation: http://localhost:${PORT}/api-docs`);
  console.log(`❤️  Health Check: http://localhost:${PORT}/health`);
});

module.exports = app;