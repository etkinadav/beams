const axios = require('axios');

/**
 * Send message to Landbot API
 * POST /api/landbot/send
 * Body: { userId, staticField, message }
 */
exports.sendMessage = async (req, res, next) => {
    try {
        console.log('🔵 [Landbot] POST /api/landbot/send - Route entered');
        console.log('🔵 [Landbot] Request body keys:', Object.keys(req.body || {}));

        const { userId, staticField, message } = req.body;

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

        // Get customerId from environment
        const customerId = process.env.LANDBOT_CUSTOMER_ID;
        if (!customerId) {
            console.error('❌ [Landbot] Missing LANDBOT_CUSTOMER_ID in environment');
            return res.status(500).json({
                error: 'Missing Landbot customer ID in env'
            });
        }
        console.log('🔵 [Landbot] Resolved customerId:', customerId);

        // Determine token source
        let token = process.env.LANDBOT_TOKEN || process.env.LANDBOT_API_TOKEN;
        let tokenSource = 'env';
        
        // In non-production, allow using staticField as token for testing
        if (!token && process.env.NODE_ENV !== 'production' && staticField) {
            token = staticField;
            tokenSource = 'body (dev mode)';
            console.log('🔵 [Landbot] Using token from request body (dev mode)');
        } else if (token) {
            console.log('🔵 [Landbot] Using token from environment');
        } else {
            console.error('❌ [Landbot] Missing Landbot token in env and no token in body');
            return res.status(500).json({
                error: 'Missing Landbot token in env'
            });
        }

        console.log('🔵 [Landbot] Token source:', tokenSource);

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
