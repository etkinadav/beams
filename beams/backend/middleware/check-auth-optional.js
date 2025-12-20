const jwt = require("jsonwebtoken");

/**
 * Optional auth middleware with TEST MODE bypass for Landbot route
 * - If user is authenticated -> allow as usual
 * - If not authenticated:
 *   - If bypass conditions match (NODE_ENV !== "production" AND LAND_BOT_TEST_BYPASS === "true") -> allow
 *   - Else -> return 401 with helpful message
 */
module.exports = (req, res, next) => {
    // Calculate bypass condition EXACTLY as specified
    const nodeEnv = process.env.NODE_ENV;
    const bypassEnv = process.env.LAND_BOT_TEST_BYPASS;
    const isNonProduction = nodeEnv !== 'production';
    const bypassEnabled = bypassEnv === 'true';
    const allowBypass = bypassEnabled && isNonProduction;
    
    console.log('🔵 [LandbotAuth] ========== AUTH MIDDLEWARE ENTERED ==========');
    console.log('🔵 [LandbotAuth] Request path:', req.path);
    console.log('🔵 [LandbotAuth] Request originalUrl:', req.originalUrl);
    console.log('🔵 [LandbotAuth] NODE_ENV:', nodeEnv || '(undefined)');
    console.log('🔵 [LandbotAuth] LAND_BOT_TEST_BYPASS:', bypassEnv || '(undefined)');
    console.log('🔵 [LandbotAuth] isNonProduction:', isNonProduction);
    console.log('🔵 [LandbotAuth] bypassEnabled:', bypassEnabled);
    console.log('🔵 [LandbotAuth] allowBypass:', allowBypass);
    
    // Try to authenticate first
    const authHeader = req.headers.authorization;
    let isAuthenticated = false;
    let userData = null;
    
    if (authHeader) {
        try {
            const token = authHeader.split(" ")[1];
            if (token) {
                const decodedToken = jwt.verify(token, process.env.JWT_KEY);
                userData = {
                    email: decodedToken.email,
                    userId: decodedToken.userId,
                };
                req.userData = userData;
                isAuthenticated = true;
                console.log('✅ [LandbotAuth] User authenticated via JWT token, userId:', userData.userId);
            }
        } catch (error) {
            // Token exists but is invalid - will check for bypass below
            console.log('⚠️ [LandbotAuth] Invalid or expired token:', error.message);
        }
    } else {
        console.log('⚠️ [LandbotAuth] No Authorization header present');
    }
    
    console.log('🔵 [LandbotAuth] isAuthenticated:', isAuthenticated);
    console.log('🔵 [LandbotAuth] req.userData exists:', !!req.userData);

    // Decision logic
    if (isAuthenticated) {
        console.log('✅ [LandbotAuth] DECISION: auth ok - proceeding');
        return next();
    }
    
    if (allowBypass) {
        console.log('✅ [LandbotAuth] DECISION: bypass ok - proceeding without auth');
        req.authBypassed = true;
        return next();
    }
    
    // No auth and no bypass - reject
    console.log('❌ [LandbotAuth] DECISION: reject 401 - authentication required');
    console.log('❌ [LandbotAuth] ========== END AUTH MIDDLEWARE (401) ==========');
    res.status(401).json({
        error: "Unauthorized",
        hint: "Login required or enable LAND_BOT_TEST_BYPASS in non-production"
    });
};
