// server.js
require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const connectDB = require('./config/db');
const listEndpoints = require('express-list-endpoints');

const app = express();
const PORT = process.env.PORT || 5000;

// Connect DB
connectDB(process.env.MONGO_URI);

// Middlewares
app.use(cors());
app.use(express.json());

// Static files
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));
app.use('/certs', express.static(path.join(__dirname, 'certs')));

// Routes
app.use('/api/auth', require('./routes/authRoutes'));
app.use('/api/courses', require('./routes/courseRoutes'));
app.use('/api/lessons', require('./routes/lessonRoutes'));
app.use('/api/tests', require('./routes/testRoutes'));
app.use('/api/progress', require('./routes/progressRoutes'));
app.use('/api/certificates', require('./routes/certificateRoutes'));
app.use('/api/achievements', require('./routes/achievementRoutes')); // ✅ qo‘shildi

// Root
app.get('/', (req, res) => res.send('LMS service ishlamoqda 🚀'));

// Error handler (oddiy)
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ message: 'Ichki server xatoligi' });
});

// List all endpoints
app.listen(PORT, () => {
  console.log(`✅ Server ${PORT}-porta ishlayapti`);
  console.log('📌 Available endpoints:', listEndpoints(app));
});
