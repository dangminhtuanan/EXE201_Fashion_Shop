const express = require("express");
const router = express.Router();
const { uploadImage } = require("../controllers/uploadController");
const authMiddleware = require("../middleware/authMiddleware");

// Cấu hình Multer (RAM Storage)
const multer = require("multer");
const storage = multer.memoryStorage();
const upload = multer({ storage: storage });

/**
 * @swagger
 * /upload:
 *   post:
 *     summary: Tải hình ảnh lên Cloudinary
 *     tags: [Upload]
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               image:
 *                 type: string
 *                 format: binary
 *                 description: File ảnh cần upload (Hỗ trợ png, jpg, jpeg)
 *     responses:
 *       200:
 *         description: Tải lên thành công, trả về URL của ảnh
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: Upload thành công
 *                 url:
 *                   type: string
 *                 public_id:
 *                   type: string
 *       400:
 *         description: Thiếu file ảnh hoặc định dạng file không hợp lệ
 *       500:
 *         description: Lỗi kết nối Cloudinary hoặc lỗi hệ thống
 */
router.post("/", upload.single("image"), uploadImage);

module.exports = router;