const path = require("path");
const express = require("express");
const bodyParser = require("body-parser");
const mongoose = require("mongoose");
const fs = require("fs");

const userRoutes = require("./routes/user");
const productsRoutes = require("./routes/products");

require('dotenv').config();

const app = express();



// Enable MongoDB connection using mongoose and dotenv
require('dotenv').config({ path: __dirname + '/.env' });
mongoose.connect(process.env.MONGO_URI, { useNewUrlParser: true, useUnifiedTopology: true })
    .then(() => {
        console.log('✅ Connected to MongoDB Atlas');
        console.log('📦 Using database:', mongoose.connection.name);
    })
    .catch(err => console.error('❌ MongoDB connection error:', err));

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: false }));
app.use("/images", express.static(path.join("backend/images")));

app.use((req, res, next) => {
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader(
        "Access-Control-Allow-Headers",
        "Origin, X-Requested-With, Content-Type, Accept, Authorization"
    );
    res.setHeader(
        "Access-Control-Allow-Methods",
        "GET, POST, PATCH, PUT, DELETE, OPTIONS"
    );
    next();
});

// app.use("/api/posts", postsRoutes);
app.use("/api/user", userRoutes);
app.use("/api/products", productsRoutes);

// Blender parameters endpoint
const PARAMS_FILE = path.join(__dirname, '..', 'blender_params.json');

// Create initial params file if it doesn't exist
if (!fs.existsSync(PARAMS_FILE)) {
    const initialParams = { a: 1.0, b: 2.0, timestamp: new Date().toISOString(), source: 'initial' };
    fs.writeFileSync(PARAMS_FILE, JSON.stringify(initialParams, null, 2));
    console.log('📝 Created initial Blender params file');
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

        console.log(`✅ [${timestamp}] Updated Blender params: a=${paramsData.a}, b=${paramsData.b}`);

        res.json({
            status: 'success',
            message: 'Parameters updated',
            params: paramsData
        });

    } catch (error) {
        console.error('❌ Error updating Blender params:', error);
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

module.exports = app;
