const express = require("express");
const router = express.Router();

const landbotController = require("../controllers/landbot");
const checkAuthOptional = require("../middleware/check-auth-optional");

// GET /api/landbot/debug - Debug endpoint to check env vars and bypass status
router.get("/debug", (req, res) => {
    const nodeEnv = process.env.NODE_ENV || '(undefined)';
    const bypassEnv = process.env.LAND_BOT_TEST_BYPASS || '(undefined)';
    const isNonProduction = nodeEnv !== 'production';
    const bypassEnabled = bypassEnv === 'true';
    const allowBypass = bypassEnabled && isNonProduction;
    
    res.json({
        nodeEnv: nodeEnv,
        bypassEnv: bypassEnv,
        allowBypass: allowBypass,
        isNonProduction: isNonProduction,
        bypassEnabled: bypassEnabled
    });
});

// POST /api/landbot/send - Send message to Landbot API
// Using optional auth middleware: requires auth in production, allows bypass in dev
router.post("/send", checkAuthOptional, landbotController.sendMessage);

module.exports = router;

