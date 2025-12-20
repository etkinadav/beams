const jwt = require("jsonwebtoken");

/**
 * Optional auth middleware that allows bypassing auth in non-production mode
 * for specific routes (like /api/landbot/send for testing)
 */
module.exports = (req, res, next) => {
    // In non-production, allow bypassing auth
    if (process.env.NODE_ENV !== 'production') {
        console.log('🔵 [OptionalAuth] Non-production mode - checking for optional auth');
        
        // Check if Authorization header exists
        const authHeader = req.headers.authorization;
        if (!authHeader) {
            console.log('🔵 [OptionalAuth] No auth header - proceeding without auth (dev mode)');
            return next();
        }

        // If auth header exists, try to validate it
        try {
            const token = authHeader.split(" ")[1];
            const decodedToken = jwt.verify(token, process.env.JWT_KEY);
            req.userData = {
                email: decodedToken.email,
                userId: decodedToken.userId,
            };
            console.log('🔵 [OptionalAuth] Token validated successfully');
            next();
        } catch (error) {
            console.log('🔵 [OptionalAuth] Token validation failed - proceeding without auth (dev mode)');
            console.log('🔵 [OptionalAuth] Error:', error.message);
            // In dev mode, allow to proceed without valid token
            next();
        }
    } else {
        // In production, require valid auth
        try {
            const token = req.headers.authorization.split(" ")[1];
            const decodedToken = jwt.verify(token, process.env.JWT_KEY);
            req.userData = {
                email: decodedToken.email,
                userId: decodedToken.userId,
            };
            next();
        } catch (error) {
            console.log("❌ [OptionalAuth] Auth failed in production mode");
            console.log("❌ [OptionalAuth] Error:", error.message);
            res.status(401).json({ 
                error: "Check_auth-Auth-Failed-token-incorrect" 
            });
        }
    }
};

