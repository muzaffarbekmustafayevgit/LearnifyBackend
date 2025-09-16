// swagger.js
const swaggerAutogen = require('swagger-autogen')();

const outputFile = './swagger-output.json';
const endpointsFiles = ['./server.js']; // yoki barcha route fayllaringiz

const doc = {
  info: {
    title: 'Learnify API',
    description: 'Learnify platformasi uchun Swagger hujjatlari',
  },
  host: 'localhost:5000',
  schemes: ['http'],
};

swaggerAutogen(outputFile, endpointsFiles, doc);
