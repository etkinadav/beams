const express = require("express");
const router = express.Router();

const landbotController = require("../controllers/landbot");

// GET /api/landbot/debug - Safe debug endpoint (no secrets)
router.get("/debug", (req, res) => {
    const tokenMeta = landbotController.getTokenMetadata();
    
    res.json({
        ok: tokenMeta.configured,
        landbotTokenConfigured: tokenMeta.configured,
        tokenMeta: {
            len: tokenMeta.len,
            first4: tokenMeta.first4,
            last4: tokenMeta.last4,
            sha256: tokenMeta.sha256
        },
        landbotEndpoint: `https://api.landbot.io/v1/customers/{customerId}/send_text/`
    });
});

// POST /api/landbot/send - Send message to Landbot API
router.post("/send", landbotController.sendMessage);

module.exports = router;

