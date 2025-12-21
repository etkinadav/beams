const axios = require('axios');

/**
 * Send message to Landbot API
 * POST /api/landbot/send
 * Body: { userId, staticField, message }
 */
exports.sendMessage = async (req, res, next) => {
    try {
        const { userId, staticField, message } = req.body;
        
        // Determine token source
        const testMode = process.env.ALLOW_LANDBOT_TEST_MODE === "true";
        const envToken = process.env.LANDBOT_TOKEN || process.env.LANDBOT_API_TOKEN;
        let token = null;
        let tokenSource = null;
        
        if (testMode && staticField) {
            token = staticField;
            tokenSource = 'body (test mode)';
        } else if (envToken) {
            token = envToken;
            tokenSource = 'env';
        }
        
        console.log(JSON.stringify({
            tag: "LANDBOT_DEBUG",
            time: new Date().toISOString(),
            method: req.method,
            url: req.originalUrl,
            headers: req.headers,
            body: req.body,
            extractedToken: token || null,
            nodeEnv: process.env.NODE_ENV,
            landbotEnvKeys: Object.keys(process.env).filter(k => k.includes("LANDBOT"))
        }));
        
        console.log("LAND BOT SEND – NO AUTH TEST MODE");
        console.log('🔵 [Landbot] ========== CONTROLLER ENTERED (NO AUTH) ==========');
        console.log('🔵 [Landbot] POST /api/landbot/send - Controller entered');
        console.log('🔵 [Landbot] Request body keys:', Object.keys(req.body || {}));
        console.log("testMode:", testMode, "envToken:", !!envToken, "bodyStaticField:", !!staticField);
        console.log('🔵 [Landbot] Token source:', tokenSource);

        // Sanitize body for logging (do NOT log token values)
        const sanitizedBody = {
            userId: userId || null,
            staticField: staticField ? '[REDACTED - token present]' : null,
            message: message ? `${message.substring(0, 50)}${message.length > 50 ? '...' : ''}` : null
        };
        console.log('🔵 [Landbot] Sanitized request body:', sanitizedBody);

        // Validate required fields
        if (!userId) {
            console.error('❌ [Landbot] Validation error: userId missing');
            return res.status(400).json({
                error: 'userId is required'
            });
        }

        if (!message) {
            console.error('❌ [Landbot] Validation error: message missing');
            return res.status(400).json({
                error: 'message is required'
            });
        }

        // Use userId from request body as customerId (TEST MODE - no env var)
        const customerId = userId;
        console.log("LAND BOT SEND – customerId:", customerId);
        
        // Validate token exists
        if (!token) {
            console.error('❌ [Landbot] Missing Landbot token');
            return res.status(400).json({
                error: "Missing Landbot token"
            });
        }

        // Prepare request to Landbot API
        // Based on Landbot API: POST /v1/customers/{customer_id}/send_text/
        const landbotApiUrl = `https://api.landbot.io/v1/customers/${customerId}/send_text/`;
        const landbotPayload = {
            message: message
        };

        console.log('📤 [Landbot] Sending to Landbot API:', {
            url: landbotApiUrl,
            payloadKeys: Object.keys(landbotPayload),
            messageLength: message.length
        });

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

        // Log response (truncated for safety)
        const responseData = landbotResponse.data;
        const truncatedResponse = typeof responseData === 'string' 
            ? responseData.substring(0, 200) + (responseData.length > 200 ? '...' : '')
            : JSON.stringify(responseData).substring(0, 200);
        
        console.log('✅ [Landbot] Landbot API response:', {
            status: landbotResponse.status,
            statusText: landbotResponse.statusText,
            dataPreview: truncatedResponse
        });

        // Return success response
        res.status(200).json({
            success: true,
            message: 'Message sent successfully to Landbot',
            data: responseData
        });

    } catch (error) {
        console.error('❌ [Landbot] Error in sendMessage handler:', error);
        console.error('❌ [Landbot] Error stack:', error.stack);
        
        // Handle axios errors (Landbot API errors)
        if (error.response) {
            const status = error.response.status;
            const errorData = error.response.data;
            
            console.error('❌ [Landbot] Landbot API error response:', {
                status: status,
                statusText: error.response.statusText,
                data: typeof errorData === 'string' 
                    ? errorData.substring(0, 200) 
                    : JSON.stringify(errorData).substring(0, 200)
            });

            // Forward Landbot's status and error to frontend
            return res.status(status).json({
                error: 'Failed to send message to Landbot API',
                details: errorData
            });
        }

        // Handle other errors (network, etc.)
        res.status(500).json({
            error: 'Internal error',
            details: error.message
        });
    }
};
