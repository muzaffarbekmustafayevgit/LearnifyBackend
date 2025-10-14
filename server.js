// server.js
require('dotenv').config();
const express = require('express');
const path = require('path');
const fs = require('fs');
const connectDB = require('./config/db');
const listEndpoints = require('express-list-endpoints');
const morgan = require('morgan');
const helmet = require('helmet');
const mongoSanitize = require('express-mongo-sanitize');
const xss = require('xss-clean');
const rateLimit = require('express-rate-limit');
const cors = require('cors');
const swaggerUi = require('swagger-ui-express');

// ---------- Dynamic config helper ----------
const parseJsonOrCsv = (str) => {
  if (!str) return null;
  str = str.trim();
  try { return JSON.parse(str); } catch (e) { /* ignore */ }
  // fallback to comma separated
  return str.split(',').map(s => s.trim()).filter(Boolean);
};

const parseStaticMappings = (str) => {
  // format: "uploads:uploads,certs:certs,public:public"
  if (!str) return {};
  return str.split(',').map(pair => pair.trim()).reduce((acc, cur) => {
    const [urlPath, fsPath] = cur.split(':').map(s => s.trim());
    if (urlPath && fsPath) acc[urlPath] = fsPath;
    return acc;
  }, {});
};

// ---------- App init ----------
const app = express();
const PORT = process.env.PORT || 5000;
const NODE_ENV = process.env.NODE_ENV || 'development';

// ---------- DB connect ----------
if (!process.env.MONGO_URI) {
  console.error('❌ ERROR: MONGO_URI .env faylda mavjud emas!');
  process.exit(1);
}
connectDB(process.env.MONGO_URI);

// ---------- Middlewares ----------
if (process.env.MORGAN !== 'off') app.use(morgan(process.env.MORGAN || 'dev'));
app.use(helmet());
app.use(mongoSanitize());
app.use(xss());
app.use(express.json({ limit: process.env.JSON_LIMIT || '10mb' }));
app.use(express.urlencoded({ extended: true, limit: process.env.JSON_LIMIT || '10mb' }));

// ---------- CORS dynamic (TUZATILGAN) ----------
const getCorsOrigins = () => {
  if (process.env.CORS_ORIGINS) {
    return parseJsonOrCsv(process.env.CORS_ORIGINS);
  }
  
  return process.env.NODE_ENV === "production"
    ? [
        "https://workeraweb.uz",
        "https://www.workeraweb.uz",
        "http://localhost:5173",
        "http://localhost:3000", 
        "http://localhost:5000"
      ]
    : [
        "http://localhost:5173",
        "http://localhost:3000",
        "http://localhost:5000",
        "http://127.0.0.1:5173",
        "http://127.0.0.1:3000",
        "https://localhost:5000",
      ];
};

const corsOrigins = getCorsOrigins();

console.log('🌐 CORS sozlamalari:');
console.log(`   - Muhit: ${NODE_ENV}`);
console.log(`   - Ruxsat etilgan domainlar: ${corsOrigins.join(', ')}`);

const corsOptions = {
  origin: (origin, callback) => {
    // ✅ PRODUCTION DA HAM origin bo'lmasa ruxsat berish
    if (!origin) {
      console.log('🔓 No origin detected - allowing access');
      return callback(null, true);
    }

    // ✅ Ruxsat etilganlar ro'yxatini tekshirish
    if (corsOrigins.includes(origin)) {
      console.log(`✅ CORS allowed: ${origin}`);
      return callback(null, true);
    }

    // ❌ Ruxsat etilmagan domain
    console.log(`🚫 CORS blocked: ${origin}`);
    return callback(new Error(`CORS: ${origin} domaini ruxsat etilmagan`));
  },
  methods: process.env.CORS_METHODS || "GET,HEAD,PUT,PATCH,POST,DELETE,OPTIONS",
  allowedHeaders: process.env.CORS_HEADERS || "Content-Type,Authorization,X-Requested-With,Accept,Origin",
  credentials: true,
  optionsSuccessStatus: 200
};

app.use(cors(corsOptions));
app.options('*', cors(corsOptions));

// ---------- Rate limits dynamic ----------
const generalWindowMs = parseInt(process.env.RATE_WINDOW_MS || `${15*60*1000}`, 10);
const generalMax = parseInt(process.env.RATE_MAX || '220', 10);
const authMax = parseInt(process.env.AUTH_RATE_MAX || '10', 10);

const generalLimiter = rateLimit({
  windowMs: generalWindowMs,
  max: generalMax,
  message: { message: process.env.RATE_MESSAGE || 'Juda ko‘p so‘rovlar; keyinroq urinib ko‘ring.' },
  standardHeaders: true,
  legacyHeaders: false
});
app.use('/api', generalLimiter);

const authLimiter = rateLimit({
  windowMs: generalWindowMs,
  max: authMax,
  message: { message: process.env.AUTH_RATE_MESSAGE || 'Juda ko‘p autentifikatsiya urinishlari. Keyinroq urinib ko‘ring.' },
  standardHeaders: true,
  legacyHeaders: false
});
app.use('/api/auth', authLimiter);

// ---------- Static directories dynamic ----------
const staticMappings = parseStaticMappings(process.env.STATIC_PATHS || 'uploads:uploads,certs:certs,public:public');
Object.entries(staticMappings).forEach(([urlPath, fsPath]) => {
  const resolved = path.join(__dirname, fsPath);
  if (fs.existsSync(resolved)) {
    app.use(`/${urlPath}`, express.static(resolved));
    console.log(`📁 Static served: /${urlPath} -> ${resolved}`);
  } else {
    console.warn(`⚠️ Static path not found: ${resolved} (skipped)`);
  }
});

// ---------- Auto-load routes from ./routes (dynamic) ----------
const routesDir = path.join(__dirname, 'routes');
if (fs.existsSync(routesDir)) {
  fs.readdirSync(routesDir).forEach(file => {
    // accept only .js files
    if (!file.endsWith('.js')) return;
    const routePath = `./routes/${file}`;
    try {
      const route = require(routePath);
      // convention: file name like userRoutes.js -> prefix /api/users (you can customize mapping below)
      // We'll attempt to read exported.routerPrefix or fallback to filename parsing
      const exportedPrefix = route.routerPrefix || null;
      const prefix = exportedPrefix || inferPrefixFromFilename(file);
      app.use(prefix, route);
      console.log(`🔌 Route mounted: ${prefix} -> ${routePath}`);
    } catch (err) {
      console.error(`❌ Failed to load route ${routePath}:`, err.message);
    }
  });
} else {
  console.warn(`⚠️ Routes directory not found: ${routesDir}`);
}

function inferPrefixFromFilename(filename) {
  // e.g. authRoutes.js => /api/auth
  const name = filename.replace('.js','').replace(/Routes$/i, '');
  return `/api/${name}`;
}

// ---------- Swagger (dynamic file path) ----------
const swaggerFilePath = process.env.SWAGGER_FILE || path.join(__dirname, 'swagger-output.json');
if (fs.existsSync(swaggerFilePath)) {
  const swaggerFile = require(swaggerFilePath);
  
  // Swagger UI uchun CORS sozlamalari
  const swaggerOptions = {
    swaggerOptions: {
      persistAuthorization: true,
      displayRequestDuration: true,
      docExpansion: 'none'
    },
    customCss: '.swagger-ui .topbar { display: none }',
    customSiteTitle: "Learnify LMS API Documentation"
  };
  
  app.use(process.env.SWAGGER_UI_PATH || '/api-docs', 
    swaggerUi.serve, 
    swaggerUi.setup(swaggerFile, swaggerOptions)
  );
  console.log(`🧾 Swagger UI available at ${process.env.SWAGGER_UI_PATH || '/api-docs'}`);
} else {
  console.warn(`⚠️ Swagger file not found at ${swaggerFilePath} (Swagger UI disabled)`);
}

// ---------- Health check (dynamic path) ----------
app.get(process.env.HEALTH_PATH || '/health', (req, res) => {
  res.status(200).json({
    status: 'OK',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    env: NODE_ENV,
    cors: {
      enabled: true,
      origins: corsOrigins
    }
  });
});

// ---------- Root endpoint ----------
app.get('/', (req, res) => {
  res.json({
    message: process.env.ROOT_MESSAGE || 'Learnify LMS Service ishlamoqda 🚀',
    version: process.env.APP_VERSION || '1.0.0',
    documentation: `${req.protocol}://${req.get('host')}${process.env.SWAGGER_UI_PATH || '/api-docs'}`,
    environment: NODE_ENV
  });
});

// ---------- 404 handler ----------
app.use((req, res, next) => {
  res.status(404).json({
    message: 'Sahifa topilmadi',
    path: req.path,
    method: req.method,
    availableEndpoints: listEndpoints(app).map(ep => ({
      path: ep.path,
      methods: ep.methods
    }))
  });
});

// ---------- Global error handler ----------
app.use((err, req, res, next) => {
  console.error('❌ Xatolik:', err.stack || err);
  
  // CORS xatolari
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
  if (err.name === 'JsonWebTokenError') return res.status(401).json({ message: 'Yaroqsiz token' });
  if (err.name === 'TokenExpiredError') return res.status(401).json({ message: 'Token muddati tugagan' });

  res.status(err.status || 500).json({
    message: NODE_ENV === 'production' ? 'Ichki server xatoligi' : (err.message || 'Nomaʼlum xato'),
    ...(NODE_ENV === 'development' && { stack: err.stack })
  });
});

// ---------- Process handlers ----------
process.on('unhandledRejection', (err) => {
  console.error('❌ Tutib olinmagan rad etilish:', err);
  // Graceful shutdown recommended; we'll exit to avoid unknown state.
  process.exit(1);
});
process.on('uncaughtException', (err) => {
  console.error('❌ Tutib olinmagan istisno:', err);
  process.exit(1);
});

// ---------- Graceful shutdown ----------
const gracefulShutdown = (signal) => {
  console.log(`\n📢 ${signal} signal received: closing HTTP server`);
  server.close(() => {
    console.log('✅ HTTP server closed');
    process.exit(0);
  });
};
process.on('SIGINT', () => gracefulShutdown('SIGINT'));
process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));

// ---------- Start server ----------
const server = app.listen(PORT, () => {
  console.log(`\n🚀 Server ${PORT}-porta ishlayapti`);
  console.log(`📍 Environment: ${NODE_ENV}`);
  const docPath = process.env.SWAGGER_UI_PATH || '/api-docs';
  console.log(`📖 API Documentation: http://localhost:${PORT}${docPath}`);
  console.log(`❤️  Health Check: http://localhost:${PORT}${process.env.HEALTH_PATH || '/health'}`);
  console.log('\n📌 Available endpoints:');
  const endpoints = listEndpoints(app);
  endpoints.forEach(endpoint => {
    if (endpoint.path !== '/') {
      console.log(`   ${endpoint.methods.join(', ').padEnd(10)} ${endpoint.path}`);
    }
  });
});

module.exports = app;