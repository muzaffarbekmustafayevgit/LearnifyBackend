// swagger.js
const swaggerAutogen = require('swagger-autogen')();

const doc = {
  info: {
    title: 'LMS API Documentation',
    description: 'Learning Management System API with Role-based Access',
    version: '1.0.0',
    contact: {
      name: 'LMS Support',
      email: 'support@lms.com'
    }
  },
  host: process.env.NODE_ENV === 'production' 
    ? 'your-production-domain.com' 
    : `localhost:${process.env.PORT || 5000}`,
  schemes: process.env.NODE_ENV === 'production' ? ['https'] : ['http'],
  basePath: '/api',
  securityDefinitions: {
    bearerAuth: {
      type: 'apiKey',
      name: 'authorization',
      in: 'header',
      description: 'Enter token in format: Bearer {token}'
    }
  },
  security: [{ bearerAuth: [] }],
  tags: [
    { name: 'Auth', description: 'Authentication endpoints' },
    { name: 'Courses', description: 'Course management' },
    { name: 'Modules', description: 'Module operations' },
    { name: 'Lessons', description: 'Lesson management' },
    { name: 'Tests', description: 'Test operations' },
    { name: 'Progress', description: 'Student progress tracking' },
    { name: 'Certificates', description: 'Certificate management' },
    { name: 'Achievements', description: 'Achievements system' },
    { name: 'Users', description: 'User management (Admin only)' }
  ],
  components: {
    securitySchemes: {
      bearerAuth: {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT'
      }
    },
    schemas: {
      User: {
        type: 'object',
        properties: {
          _id: { type: 'string' },
          name: { type: 'string' },
          email: { type: 'string' },
          role: { type: 'string', enum: ['student', 'teacher', 'admin'] },
          points: { type: 'number' },
          rank: { type: 'string' }
        }
      },
      Course: {
        type: 'object',
        required: ['title'],
        properties: {
          title: { type: 'string' },
          description: { type: 'string' },
          teacher: { type: 'string' },
          isCompleted: { type: 'boolean' }
        }
      },
      Lesson: {
        type: 'object',
        required: ['title', 'type', 'course'],
        properties: {
          title: { type: 'string' },
          type: { type: 'string', enum: ['video', 'material', 'text', 'test'] },
          contentUrl: { type: 'string' },
          textContent: { type: 'string' },
          course: { type: 'string' }
        }
      },
      LoginRequest: {
        type: 'object',
        required: ['email', 'password'],
        properties: {
          email: { type: 'string', format: 'email' },
          password: { type: 'string' }
        }
      },
      LoginResponse: {
        type: 'object',
        properties: {
          token: { type: 'string' },
          user: { $ref: '#/components/schemas/User' }
        }
      },
      Error: {
        type: 'object',
        properties: {
          message: { type: 'string' },
          errors: { type: 'array', items: { type: 'string' } }
        }
      }
    }
  }
};

const outputFile = './swagger-output.json';
const endpointsFiles = [
  './routes/authRoutes.js',
  './routes/courseRoutes.js', 
  './routes/moduleRoutes.js',
  './routes/lessonRoutes.js',
  './routes/testRoutes.js',
  './routes/progressRoutes.js',
  './routes/certificateRoutes.js',
  './routes/achievementRoutes.js',
  './routes/userRoutes.js'
];

swaggerAutogen(outputFile, endpointsFiles, doc);