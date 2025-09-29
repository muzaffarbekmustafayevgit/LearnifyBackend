const express = require("express");
const router = express.Router();
const courseController = require("../controllers/courseController");
const { verifyToken, requireRole } = require("../middlewares/authMiddleware");

// 📚 Ommaviy kurslar (token talab qilmaydi)
router.get("/", courseController.getAllCourses);

// 🔐 Quyidagilardan boshlab token talab qilinadi
router.use(verifyToken);

// ➕ YANGI: Kurs yaratish (faqat teacher/admin)
router.post("/", requireRole(["teacher", "admin"]), courseController.createCourse);

// Mening kurslarim
router.get("/my-courses", requireRole(["teacher", "admin"]), courseController.getMyCourses);

// Statistika
router.get("/:id/stats", requireRole(["teacher", "admin"]), courseController.getCourseStats);

// Yangilash, o'chirish va boshqalar
router.put("/:id", requireRole(["teacher", "admin"]), courseController.updateCourse);
router.delete("/:id", requireRole(["teacher", "admin"]), courseController.deleteCourse);
router.patch("/:id/publish", requireRole(["teacher", "admin"]), courseController.publishCourse);
router.patch("/:id/complete", requireRole(["teacher", "admin"]), courseController.completeCourse);

// ❗ Eng oxirida umumiy kurs olish
router.get("/:id", courseController.getCourse);

module.exports = router;