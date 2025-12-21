const axios = require('axios');
const { v4: uuidv4 } = require('uuid');

/**
 * Send message to Landbot API
 * POST /api/landbot/send
 * Body: { userId, staticField, message }
 */
exports.sendMessage = async (req, res, next) => {
    // Generate correlation ID for this request
    const requestId = uuidv4();
    
    // Declare tokenSource in outer scope for error logging
    let tokenSource = null;
    
    try {
        const { userId, staticField, message } = req.body;
        
        // Determine token source - Priority: (a) env var, (b) Authorization header, (c) body (test mode only)
        const envToken = process.env.LANDBOT_TOKEN || process.env.LANDBOT_API_TOKEN;
        const testModeEnabled = process.env.ALLOW_LANDBOT_TEST_MODE === "true";
        
        let token = null;
        const attemptedSources = [];
        
        // Priority (a): Environment variable (preferred for production)
        if (envToken) {
            token = envToken;
            tokenSource = 'env';
        } else {
            attemptedSources.push('env');
            
            // Priority (b): Authorization header (fallback for dev/testing)
            const authHeader = req.headers['authorization'];
            if (authHeader && authHeader.startsWith('Bearer ')) {
                token = authHeader.substring(7).trim();
                tokenSource = 'auth_header';
            } else {
                attemptedSources.push('auth_header');
                
                // Priority (c): Body field (only if test mode is explicitly enabled)
                if (testModeEnabled && req.body.landbotToken) {
                    token = req.body.landbotToken;
                    tokenSource = 'body_test_mode';
                } else if (testModeEnabled) {
                    attemptedSources.push('body_test_mode');
                }
            }
        }

        // Validate required fields
        if (!userId) {
            const errorResponse = {
                requestId,
                error: 'userId is required'
            };
            return res.status(400).json(errorResponse);
        }

        if (!message) {
            const errorResponse = {
                requestId,
                error: 'message is required'
            };
            return res.status(400).json(errorResponse);
        }
        
        // Validate token exists
        if (!token) {
            const errorResponse = {
                requestId,
                error: "Missing Landbot token",
                hint: `Token not found in: ${attemptedSources.join(', ')}. ${testModeEnabled ? 'Test mode is enabled but landbotToken not provided in body.' : 'Set LANDBOT_TOKEN env var or provide Authorization header.'}`
            };
            
            console.log("[LANDBOT_SEND_ERROR]", JSON.stringify({
                timestamp: new Date().toISOString(),
                route: '/api/landbot/send',
                method: req.method,
                requestId,
                bodyKeys: Object.keys(req.body || {}),
                userId: userId || null,
                tokenSource: 'missing',
                attemptedSources,
                error: "Missing Landbot token",
                nodeEnv: process.env.NODE_ENV
            }, null, 2));
            
            return res.status(400).json(errorResponse);
        }

        // Use userId from request body as customerId
        const customerId = userId;

        // Prepare request to Landbot API
        // Based on Landbot API: POST /v1/customers/{customer_id}/send_text/
        const landbotApiUrl = `https://api.landbot.io/v1/customers/${customerId}/send_text/`;
        const landbotPayload = {
            message: message
        };

        // Send request to Landbot API
        const landbotResponse = await axios.post(
            landbotApiUrl,
            landbotPayload,
            {
                headers: {
                    'Authorization': `Token ${token}`,
                    'Content-Type': 'application/json'
                }
            }
        );

        // Return success response
        res.status(200).json({
            requestId,
            success: true,
            message: 'Message sent successfully to Landbot',
            data: landbotResponse.data
        });

    } catch (error) {
        // Handle axios errors (Landbot API errors)
        if (error.response) {
            const status = error.response.status;
            const errorData = error.response.data;
            
            // Sanitize error data for logging (truncate long strings)
            const sanitizedErrorData = typeof errorData === 'string' 
                ? errorData.substring(0, 500) + (errorData.length > 500 ? '...' : '')
                : (typeof errorData === 'object' ? JSON.stringify(errorData).substring(0, 500) : String(errorData));
            
            console.log("[LANDBOT_SEND_ERROR]", JSON.stringify({
                timestamp: new Date().toISOString(),
                route: '/api/landbot/send',
                method: req.method,
                requestId,
                bodyKeys: Object.keys(req.body || {}),
                userId: req.body?.userId || null,
                tokenSource: tokenSource || 'missing',
                upstreamStatus: status,
                upstreamStatusText: error.response.statusText,
                upstreamResponseBody: sanitizedErrorData,
                error: error.message,
                errorStack: error.stack ? error.stack.substring(0, 1000) : null
            }, null, 2));

            // Forward Landbot's status and error to frontend
            return res.status(status).json({
                requestId,
                error: 'Failed to send message to Landbot API',
                details: errorData
            });
        }

        // Handle other errors (network, etc.)
        console.log("[LANDBOT_SEND_ERROR]", JSON.stringify({
            timestamp: new Date().toISOString(),
            route: '/api/landbot/send',
            method: req.method,
            requestId,
            bodyKeys: Object.keys(req.body || {}),
            userId: req.body?.userId || null,
            tokenSource: tokenSource || 'missing',
            error: error.message,
            errorStack: error.stack ? error.stack.substring(0, 1000) : null
        }, null, 2));

        res.status(500).json({
            requestId,
            error: 'Internal error',
            details: error.message
        });
    }
};
