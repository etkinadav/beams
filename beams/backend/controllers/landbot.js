const axios = require('axios');

/**
 * Send message to Landbot API
 * POST /api/landbot/send
 * Body: { userId, staticField, message }
 */
exports.sendMessage = async (req, res, next) => {
    try {
        const { userId, staticField, message } = req.body;

        // Validate required fields
        if (!userId || !message) {
            return res.status(400).json({
                success: false,
                error: 'userId and message are required fields'
            });
        }

        // Get Landbot credentials from environment variables
        const customerId = process.env.LANDBOT_CUSTOMER_ID;
        const token = process.env.LANDBOT_TOKEN;

        if (!customerId || !token) {
            console.error('❌ Landbot credentials not found in environment variables');
            return res.status(500).json({
                success: false,
                error: 'Landbot API credentials not configured'
            });
        }

        // Prepare the data to send to Landbot API
        // Note: Update this structure based on your Landbot API documentation
        const landbotData = {
            customer_id: customerId,
            variables: {
                user_id: userId,
                static_field: staticField || '',
                message: message
            }
        };

        console.log('📤 Sending message to Landbot API:', {
            customer_id: customerId,
            userId: userId,
            staticField: staticField,
            message: message
        });

        // Send request to Landbot API
        // Note: Update the URL and request format based on actual Landbot API documentation
        // Example endpoint structure - adjust as needed for your Landbot setup
        const landbotApiUrl = `https://api.landbot.io/v1/customers/${customerId}/variables`;
        const landbotResponse = await axios.post(
            landbotApiUrl,
            landbotData,
            {
                headers: {
                    'Authorization': `Token ${token}`,
                    'Content-Type': 'application/json'
                }
            }
        );

        console.log('✅ Landbot API response:', landbotResponse.data);

        res.status(200).json({
            success: true,
            message: 'Message sent successfully to Landbot',
            data: landbotResponse.data
        });

    } catch (error) {
        console.error('❌ Error sending message to Landbot:', error);
        
        // Handle axios errors
        if (error.response) {
            console.error('❌ Landbot API error response:', error.response.data);
            return res.status(error.response.status).json({
                success: false,
                error: 'Failed to send message to Landbot API',
                details: error.response.data
            });
        }

        res.status(500).json({
            success: false,
            error: 'Internal server error',
            message: error.message
        });
    }
};

