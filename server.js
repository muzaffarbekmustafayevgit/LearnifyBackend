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
