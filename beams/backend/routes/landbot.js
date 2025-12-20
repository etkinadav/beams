const express = require("express");
const router = express.Router();

const landbotController = require("../controllers/landbot");

// POST /api/landbot/send - Send message to Landbot API
router.post("/send", landbotController.sendMessage);

module.exports = router;

