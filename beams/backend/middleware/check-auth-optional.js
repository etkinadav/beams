const jwt = require("jsonwebtoken");

/**
 * Optional auth middleware with TEST MODE bypass for Landbot route
 * - If user is authenticated -> allow as usual
 * - If not authenticated:
 *   - If bypass conditions match (NODE_ENV !== "production" AND LAND_BOT_TEST_BYPASS === "true") -> allow
 *   - Else -> return 401 with helpful message
 */
module.exports = (req, res, next) => {
    console.log('🔵 [LandbotAuth] POST /api/landbot/send - Auth middleware entered');
    
    // Try to authenticate first
    const authHeader = req.headers.authorization;
    
    if (authHeader) {
        try {
            const token = authHeader.split(" ")[1];
            if (token) {
                const decodedToken = jwt.verify(token, process.env.JWT_KEY);
                req.userData = {
                    email: decodedToken.email,
                    userId: decodedToken.userId,
                };
                console.log('✅ [LandbotAuth] User authenticated via JWT token');
                return next();
            }
        } catch (error) {
            // Token exists but is invalid - will check for bypass below
            console.log('⚠️ [LandbotAuth] Invalid or expired token:', error.message);
        }
    } else {
        console.log('⚠️ [LandbotAuth] No Authorization header present');
    }

    // User is not authenticated - check if bypass is enabled
    const isNonProduction = process.env.NODE_ENV !== 'production';
    const bypassEnabled = process.env.LAND_BOT_TEST_BYPASS === 'true';
    
    console.log('🔵 [LandbotAuth] Auth bypass check:', {
        isNonProduction,
        bypassEnabled,
        NODE_ENV: process.env.NODE_ENV,
        LAND_BOT_TEST_BYPASS: process.env.LAND_BOT_TEST_BYPASS
    });

    if (isNonProduction && bypassEnabled) {
        console.log('✅ [LandbotAuth] TEST MODE bypass enabled - allowing request without authentication');
        // Set a flag to indicate bypass was used (for logging in controller)
        req.authBypassed = true;
        return next();
    }

    // No bypass - return 401
    console.log('❌ [LandbotAuth] Authentication required - returning 401');
    res.status(401).json({
        error: "Unauthorized",
        hint: "Login required or enable LAND_BOT_TEST_BYPASS in non-production"
    });
};
