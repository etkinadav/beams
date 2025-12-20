const express = require("express");
const router = express.Router();

const landbotController = require("../controllers/landbot");
const checkAuthOptional = require("../middleware/check-auth-optional");

// POST /api/landbot/send - Send message to Landbot API
// Using optional auth middleware: requires auth in production, allows bypass in dev
router.post("/send", checkAuthOptional, landbotController.sendMessage);

module.exports = router;

