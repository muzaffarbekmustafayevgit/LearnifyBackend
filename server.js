// server.js
require('dotenv').config();
const express = require('express');
const cors = require('cors');
const connectDB = require('./config/db');

const app = express();
const PORT = process.env.PORT || 5000;

// Connect DB
connectDB(process.env.MONGO_URI);

// Middlewares
app.use(cors());
app.use(express.json());

// Routes
app.use('/api/auth', require('./routes/auth'));

// Root
app.get('/', (req, res) => res.send('Auth service ishlamoqda'));

// Error handler (oddiy)
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ message: 'Ichki server xatoligi' });
});

app.listen(PORT, () => {
  console.log(`Server ${PORT}-porta ishlayapti`);
});
