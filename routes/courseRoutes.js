// routes/courseRoutes.js
const express = require("express");
const router = express.Router();
const courseController = require("../controllers/courseController");
const { verifyToken, requireRole } = require("../middlewares/authMiddleware");

// 📚 Ommaviy kurslar (token talab qilmaydi)
router.get("/", courseController.getAllCourses);

// 🔍 CREATE so'rovi uchun handler (frontend prefetch uchun)
router.get("/create", (req, res) => {
  res.status(405).json({
    success: false,
    error: "Method Not Allowed",
    message: "Kurs yaratish uchun POST metodidan foydalaning: POST /api/courses"
  });
});

// 🔐 Quyidagilardan boshlab token talab qilinadi
router.use(verifyToken);

// 👤 Mening kurslarim (faqat teacher/admin)
router.get("/my-courses", requireRole(["teacher", "admin"]), courseController.getMyCourses);

// 👑 ADMIN: Barcha kurslarni olish (faqat admin)
router.get("/admin/all-courses", requireRole(["admin"]), courseController.getAllCoursesAdmin);

// ➕ Kurs yaratish (faqat teacher/admin)
router.post("/", requireRole(["teacher", "admin"]), courseController.createCourse);

// 📊 Statistika (faqat teacher/admin)
router.get("/:id/stats", requireRole(["teacher", "admin"]), courseController.getCourseStats);

// ✏️ Yangilash (faqat teacher/admin)
router.put("/:id", requireRole(["teacher", "admin"]), courseController.updateCourse);
router.patch("/:id", requireRole(["teacher", "admin"]), courseController.updateCourse);

// 🗑️ O'chirish (faqat teacher/admin)
router.delete("/:id", requireRole(["teacher", "admin"]), courseController.deleteCourse);

// 📢 Nashr qilish (faqat teacher/admin)
router.patch("/:id/publish", requireRole(["teacher", "admin"]), courseController.publishCourse);

// ✅ Tugallangan deb belgilash (faqat teacher/admin)
router.patch("/:id/complete", requireRole(["teacher", "admin"]), courseController.completeCourse);

// 🚫 Nashrdan olish (faqat teacher/admin)  
router.patch("/:id/unpublish", requireRole(["teacher", "admin"]), courseController.unpublishCourse);
// ❗ Umumiy kurs olish (token talab qilmaydi, lekin kurs statusiga qarab cheklovlar)
router.get("/:id", courseController.getCourse);

module.exports = router;