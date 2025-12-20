const express = require("express");
const router = express.Router();

const landbotController = require("../controllers/landbot");

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
// TESTING MODE: NO AUTHENTICATION REQUIRED - Will be secured later
router.post("/send", landbotController.sendMessage);

module.exports = router;

