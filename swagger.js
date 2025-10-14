/**
 * swagger.js
 * Learning Management System (LMS) API uchun avtomatik Swagger hujjatlashtirish
 * Muallif: Mustafayev Muzaffarbek
 */

require('dotenv').config();
const swaggerAutogen = require('swagger-autogen')();

// 🌍 Muhitga mos sozlamalar
const HOST =
  process.env.NODE_ENV === 'production'
    ? process.env.PROD_DOMAIN || 'api.learnify.uz'
    : `localhost:${process.env.PORT || 5000}`;

const SCHEMES = process.env.NODE_ENV === 'production' ? ['https'] : ['http'];

// 📘 Swagger hujjati konfiguratsiyasi
const doc = {
  info: {
    title: '📚 Learnify LMS API Documentation',
    description:
      'Learning Management System (LMS) uchun toʻliq API hujjati. Ushbu tizimda foydalanuvchilar rollarga (Admin, Teacher, Student) boʻlingan holda oʻquv jarayonini boshqarishadi.',
    version: '1.1.0',
    contact: {
      name: 'Learnify Support',
      email: 'support@learnify.edu.uz',
    },
  },
  host: HOST, // ✅ Tuzatildi - doimiy ravishda HOST o'zgaruvchisidan foydalanish
  schemes: SCHEMES,
  basePath: '/api',
  consumes: ['application/json', 'multipart/form-data'],
  produces: ['application/json'],

  // 🔒 Xavfsizlik konfiguratsiyasi
  securityDefinitions: {
    bearerAuth: {
      type: 'apiKey',
      name: 'authorization',
      in: 'header',
      description: 'Access token kiriting: Bearer {token}',
    },
  },
  security: [{ bearerAuth: [] }],

  // 📑 Teglar (kategoriyalar)
  tags: [
    { name: 'Auth', description: 'Foydalanuvchi autentifikatsiyasi (login, register, refresh token)' },
    { name: 'Users', description: 'Foydalanuvchi maʼlumotlari (Admin boshqaruvi)' },
    { name: 'Courses', description: 'Kurslarni yaratish, tahrirlash va oʻchirish' },
    { name: 'Modules', description: 'Modullar (boʻlimlar) boshqaruvi' },
    { name: 'Lessons', description: 'Darslar (video, material, test) boshqaruvi' },
    { name: 'Tests', description: 'Test tizimi va natijalarni tekshirish' },
    { name: 'Progress', description: 'Talaba oʻqish jarayonini kuzatish' },
    { name: 'Certificates', description: 'Kursni tugatganlarga sertifikat berish' },
    { name: 'Achievements', description: 'Foydalanuvchi yutuqlarini boshqarish' },
  ],

  // 💠 Komponentlar (model schemas)
  components: {
    securitySchemes: {
      bearerAuth: {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
      },
    },
    schemas: {
      // 👤 User model
      User: {
        type: 'object',
        required: ['name', 'email', 'role'],
        properties: {
          _id: { type: 'string' },
          name: { type: 'string', example: 'Muzaffarbek Mustafayev' },
          email: { type: 'string', format: 'email', example: 'muzaffarbek@example.com' },
          role: { type: 'string', enum: ['student', 'teacher', 'admin'] },
          points: { type: 'number', example: 250 },
          rank: { type: 'string', example: 'Gold' },
        },
      },

      // 📘 Course model
      Course: {
        type: 'object',
        required: ['title', 'teacher'],
        properties: {
          _id: { type: 'string' },
          title: { type: 'string', example: 'JavaScript Dasturlash Asoslari' },
          description: { type: 'string', example: 'Frontend uchun zamonaviy JS kursi' },
          teacher: { type: 'string', description: 'Oʻqituvchi IDʼsi' },
          isCompleted: { type: 'boolean', example: false },
        },
      },

      // 📗 Lesson model
      Lesson: {
        type: 'object',
        required: ['title', 'type', 'course'],
        properties: {
          title: { type: 'string', example: 'React Kirish' },
          type: { type: 'string', enum: ['video', 'material', 'text', 'test'] },
          contentUrl: { type: 'string', example: 'https://cdn.learnify.uz/videos/react-intro.mp4' },
          textContent: { type: 'string', example: 'React – UI yaratish uchun kutubxona.' },
          course: { type: 'string' },
        },
      },

      // 🔐 Login soʻrovi
      LoginRequest: {
        type: 'object',
        required: ['email', 'password'],
        properties: {
          email: { type: 'string', format: 'email', example: 'student@learnify.uz' },
          password: { type: 'string', example: '12345678' },
        },
      },

      // 🔑 Login javobi
      LoginResponse: {
        type: 'object',
        properties: {
          token: { type: 'string', example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6Ikp...' },
          user: { $ref: '#/components/schemas/User' },
        },
      },

      // ⚠️ Xato javobi
      Error: {
        type: 'object',
        properties: {
          message: { type: 'string', example: 'Notoʻgʻri email yoki parol' },
          errors: { type: 'array', items: { type: 'string' } },
        },
      },
    },
  },
};

// 📂 Natija fayli va marshrutlar
const outputFile = './swagger-output.json';
const endpointsFiles = [
  './routes/authRoutes.js',
  './routes/userRoutes.js',
  './routes/courseRoutes.js',
  './routes/moduleRoutes.js',
  './routes/lessonRoutes.js',
  './routes/testRoutes.js',
  './routes/progressRoutes.js',
  './routes/certificateRoutes.js',
  './routes/achievementRoutes.js',
];

// 🚀 Swagger faylini yaratish
swaggerAutogen(outputFile, endpointsFiles, doc).then(() => {
  console.log('✅ Swagger hujjatlari muvaffaqiyatli generatsiya qilindi.');
});