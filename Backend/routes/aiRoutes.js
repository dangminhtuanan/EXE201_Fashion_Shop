const express = require("express");
const {
  createBehaviorLog,
  createChatbotLog,
  chatWithGemini,
  getBehaviorLogs,
  getChatbotLogs,
  getRecommendations,
} = require("../controllers/aiController");
const authMiddleware = require("../middleware/authMiddleware");
const optionalAuthMiddleware = require("../middleware/optionalAuthMiddleware");
const { requireRoles } = require("../middleware/roleMiddleware");

const router = express.Router();
const staffOnly = [authMiddleware, requireRoles("admin", "manager", "staff")];

router.get("/recommendations", optionalAuthMiddleware, getRecommendations);
router.post("/chat", optionalAuthMiddleware, chatWithGemini);
router.post("/behavior-logs", optionalAuthMiddleware, createBehaviorLog);
router.post("/chatbot-logs", optionalAuthMiddleware, createChatbotLog);
router.get("/behavior-logs", staffOnly, getBehaviorLogs);
router.get("/chatbot-logs", staffOnly, getChatbotLogs);

module.exports = router;
