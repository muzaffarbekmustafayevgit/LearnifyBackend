<<<<<<< HEAD
// server.js
require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const connectDB = require('./config/db');
const listEndpoints = require('express-list-endpoints');

const app = express();
const PORT = process.env.PORT || 5000;

// ✅ Swagger UI ulash
const swaggerUi = require('swagger-ui-express');
const swaggerFile = require('./swagger-output.json');
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerFile));

// ✅ MongoDB bilan ulanish
connectDB(process.env.MONGO_URI);

// ✅ Middlewares
app.use(cors());
app.use(express.json());

// ✅ Static files
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));
app.use('/certs', express.static(path.join(__dirname, 'certs')));

// ✅ Routes
app.use('/api/auth', require('./routes/authRoutes'));
app.use('/api/courses', require('./routes/courseRoutes'));
app.use('/api/lessons', require('./routes/lessonRoutes'));
app.use('/api/tests', require('./routes/testRoutes'));
app.use('/api/progress', require('./routes/progressRoutes'));
app.use('/api/certificates', require('./routes/certificateRoutes'));
app.use('/api/achievements', require('./routes/achievementRoutes'));

// ✅ Root endpoint
app.get('/', (req, res) => res.send('LMS service ishlamoqda 🚀'));

// ✅ Error handler
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ message: 'Ichki server xatoligi' });
});

// ✅ Serverni ishga tushirish
app.listen(PORT, () => {
  console.log(`✅ Server ${PORT}-porta ishlayapti`);
  console.log('📌 Available endpoints:', listEndpoints(app));
  console.log(`📖 Swagger hujjatlari: http://localhost:${PORT}/api-docs`);
});
=======
// server.js
require('dotenv').config(); // eng boshida
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
const bcrypt= require('bcryptjs')
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

// CORS faqat localhost:5173
app.use(cors({
  origin: 'http://localhost:5173',
  methods: 'GET,HEAD,PUT,PATCH,POST,DELETE',
  credentials: true
}));

// JSON body parsing
app.use(express.json());

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
app.use('/api/lessons', require('./routes/lessonRoutes'));
app.use('/api/tests', require('./routes/testRoutes'));
app.use('/api/progress', require('./routes/progressRoutes'));
app.use('/api/certificates', require('./routes/certificateRoutes'));
app.use('/api/achievements', require('./routes/achievementRoutes'));
app.use('/api/users', require('./routes/userRoutes'));

// ✅ Swagger UI
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerFile));

// ✅ Root endpoint
app.get('/', (req, res) => res.send('LMS service ishlamoqda 🚀'));

// ✅ 404 handler
app.use((req, res, next) => {
  res.status(404).json({ message: 'Sahifa topilmadi' });
});

// ✅ Error handler
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ message: 'Ichki server xatoligi' });
});

// ✅ Serverni ishga tushirish
app.listen(PORT, () => {
  console.log(`✅ Server ${PORT}-porta ishlayapti`);
  console.log('📌 Available endpoints:', listEndpoints(app));
  console.log(`📖 Swagger hujjatlari: http://localhost:${PORT}/api-docs`);
});
>>>>>>> d58b04a (userController userRoutes)
