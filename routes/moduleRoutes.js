const express = require('express');
const { 
  createModule, 
  getModulesByCourse, 
  updateModule, 
  deleteModule 
} = require('../controllers/moduleController');
const authMiddleware = require('../middlewares/authMiddleware');

const router = express.Router();

// 🔹 Module CRUD
router.post('/', authMiddleware(['teacher']), createModule);
router.get('/course/:courseId', authMiddleware(), getModulesByCourse);
router.put('/:id', authMiddleware(['teacher']), updateModule);
router.delete('/:id', authMiddleware(['teacher']), deleteModule);

module.exports = router;
