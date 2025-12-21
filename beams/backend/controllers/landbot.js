const axios = require('axios');
const { v4: uuidv4 } = require('uuid');
const crypto = require('crypto');

/**
 * Token metadata (initialized at startup)
 */
let tokenMetadata = {
    configured: false,
    len: 0,
    first4: null,
    last4: null,
    sha256: null
};

/**
 * Initialize token metadata at startup
 */
function initializeTokenMetadata() {
    const token = process.env.LANDBOT_TOKEN;
    if (token && token.trim()) {
        tokenMetadata.configured = true;
        tokenMetadata.len = token.length;
        tokenMetadata.first4 = token.substring(0, 4);
        tokenMetadata.last4 = token.substring(token.length - 4);
        tokenMetadata.sha256 = crypto.createHash('sha256').update(token).digest('hex');
        console.log('✅ [Landbot] Token configured: len=' + tokenMetadata.len + ', sha256=' + tokenMetadata.sha256.substring(0, 16) + '...');
    } else {
        console.warn('⚠️ [Landbot] LANDBOT_TOKEN not configured or empty');
    }
}

// Initialize on module load
initializeTokenMetadata();

/**
 * Log full error with structured data (no secrets)
 */
function logFullError({ requestId, route, method, req, upstream, error }) {
    const logObj = {
        timestamp: new Date().toISOString(),
        requestId,
        route,
        req: {
            method,
            url: req.originalUrl || req.url,
            origin: req.headers.origin || null,
            ip: req.ip || req.connection?.remoteAddress || null,
            userAgent: req.headers['user-agent'] || null,
            bodyKeys: Object.keys(req.body || {}),
            bodySize: req.body ? JSON.stringify(req.body).length : 0
        },
        config: {
            landbotToken: {
                source: 'env:LANDBOT_TOKEN',
                len: tokenMetadata.len,
                first4: tokenMetadata.first4,
                last4: tokenMetadata.last4,
                sha256: tokenMetadata.sha256
            }
        },
        upstream: upstream || null,
        error: error ? {
            message: error.message,
            name: error.name,
            code: error.code || null,
            stackTop: error.stack ? error.stack.split('\n').slice(0, 5) : null
        } : null
    };
    
    console.error("FULL-LOG " + JSON.stringify(logObj, null, 2));
}

/**
 * Send message to Landbot API
 * POST /api/landbot/send
 * Body: { userId, message }
 */
exports.sendMessage = async (req, res, next) => {
    // Generate correlation ID for this request
    const requestId = uuidv4();
    
    try {
        const { userId, message } = req.body;
        
        // Validate required fields
        if (!userId || !userId.trim()) {
            const errorResponse = {
                requestId,
                error: 'userId is required and cannot be empty'
            };
            logFullError({
                requestId,
                route: '/api/landbot/send',
                method: req.method,
                req,
                error: new Error('userId is required and cannot be empty')
            });
            return res.status(400).json(errorResponse);
        }

        if (!message || !message.trim()) {
            const errorResponse = {
                requestId,
                error: 'message is required and cannot be empty'
            };
            logFullError({
                requestId,
                route: '/api/landbot/send',
                method: req.method,
                req,
                error: new Error('message is required and cannot be empty')
            });
            return res.status(400).json(errorResponse);
        }
        
        // Get token from environment variable ONLY
        const token = process.env.LANDBOT_TOKEN;
        
        // Validate token exists
        if (!token || !token.trim()) {
            const errorResponse = {
                requestId,
                error: 'LANDBOT_TOKEN_MISSING',
                hint: 'LANDBOT_TOKEN environment variable is not configured'
            };
            
            logFullError({
                requestId,
                route: '/api/landbot/send',
                method: req.method,
                req,
                error: new Error('LANDBOT_TOKEN_MISSING')
            });
            
            return res.status(500).json(errorResponse);
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
            ok: true,
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
            
            const upstreamInfo = {
                name: 'Landbot',
                url: `https://api.landbot.io/v1/customers/${req.body?.userId || 'unknown'}/send_text/`,
                status: status,
                statusText: error.response.statusText,
                responseBodySafe: sanitizedErrorData
            };
            
            logFullError({
                requestId,
                route: '/api/landbot/send',
                method: req.method,
                req,
                upstream: upstreamInfo,
                error: error
            });

            // If Landbot returns 401, it means token is invalid - return 502 Bad Gateway
            if (status === 401) {
                return res.status(502).json({
                    requestId,
                    error: 'LANDBOT_AUTH_FAILED',
                    hint: 'Landbot API rejected the authentication token',
                    details: errorData
                });
            }

            // Forward Landbot's status and error to frontend for other errors
            return res.status(status).json({
                requestId,
                error: 'Failed to send message to Landbot API',
                details: errorData
            });
        }

        // Handle other errors (network, etc.)
        logFullError({
            requestId,
            route: '/api/landbot/send',
            method: req.method,
            req,
            error: error
        });

        res.status(500).json({
            requestId,
            error: 'Internal error',
            details: error.message
        });
    }
};

/**
 * Get token metadata (safe, no secrets)
 */
exports.getTokenMetadata = () => {
    return {
        configured: tokenMetadata.configured,
        len: tokenMetadata.len,
        first4: tokenMetadata.first4,
        last4: tokenMetadata.last4,
        sha256: tokenMetadata.sha256
    };
};
