// Simple Express server for Blender params
const express = require('express');
const fs = require('fs');
const path = require('path');
const cors = require('cors');

const app = express();
const PORT = 3000;
const PARAMS_FILE = path.join(__dirname, 'blender_params.json');

// Middleware
app.use(cors({
    origin: 'http://localhost:4200',
    methods: ['GET', 'POST', 'OPTIONS'],
    allowedHeaders: ['Content-Type']
}));
app.use(express.json());

// Create initial params file if it doesn't exist
if (!fs.existsSync(PARAMS_FILE)) {
    const initialParams = { a: 1.0, b: 2.0, timestamp: new Date().toISOString(), source: 'initial' };
    fs.writeFileSync(PARAMS_FILE, JSON.stringify(initialParams, null, 2));
    console.log('📝 Created initial params file');
}

// POST endpoint to update parameters
app.post('/update-blender-params', (req, res) => {
    try {
        const { a, b } = req.body;
        const timestamp = new Date().toISOString();

        const paramsData = {
            a: parseFloat(a) || 1.0,
            b: parseFloat(b) || 2.0,
            timestamp: timestamp,
            source: 'angular-app'
        };

        // Write to Blender params file
        fs.writeFileSync(PARAMS_FILE, JSON.stringify(paramsData, null, 2));

        console.log(`✅ [${timestamp}] Updated params: a=${paramsData.a}, b=${paramsData.b}`);

        res.json({
            status: 'success',
            message: 'Parameters updated',
            params: paramsData
        });

    } catch (error) {
        console.error('❌ Error updating params:', error);
        res.status(500).json({
            status: 'error',
            message: error.message
        });
    }
});

// GET endpoint to read current parameters
app.get('/blender-params', (req, res) => {
    try {
        if (fs.existsSync(PARAMS_FILE)) {
            const data = JSON.parse(fs.readFileSync(PARAMS_FILE, 'utf8'));
            res.json(data);
        } else {
            res.status(404).json({ error: 'Params file not found' });
        }
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Start server
app.listen(PORT, '127.0.0.1', () => {
    console.log(`🚀 Simple Params Server running on http://127.0.0.1:${PORT}`);
    console.log(`📂 Params file: ${PARAMS_FILE}`);
    console.log(`🔗 Endpoints available:`);
    console.log(`   POST /update-blender-params`);
    console.log(`   GET  /blender-params`);
});
