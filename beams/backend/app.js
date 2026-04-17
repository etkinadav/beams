const path = require("path");
const express = require("express");
const bodyParser = require("body-parser");
const mongoose = require("mongoose");
const fs = require("fs");
const multer = require("multer");
const { v4: uuidv4 } = require("uuid");

const userRoutes = require("./routes/user");
const productsRoutes = require("./routes/products");
const screwsRoutes = require("./routes/screws");
const ordersRoutes = require("./routes/orders");
const woodsRoutes = require("./routes/woods");
const threedplannerRoutes = require("./routes/threedplanner");
const landbotRoutes = require("./routes/landbot");
const agronomistQueryRoutes = require("./routes/agronomistquery");
const aiPlaceSearchRoutes = require("./routes/aiPlaceSearch");

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
app.use("/api/screws", screwsRoutes);
app.use("/api/orders", ordersRoutes);
app.use("/api/woods", woodsRoutes);
app.use("/api/threedplanner", threedplannerRoutes);
app.use("/api/landbot", landbotRoutes);
app.use("/api/agronomist-query", agronomistQueryRoutes);
app.use("/api/ai-place-search", aiPlaceSearchRoutes);

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({ ok: true });
});

// File upload endpoints
const uploadsDir = path.join(__dirname, '..', '..', 'server', 'uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadsDir);
  },
  filename: (req, file, cb) => {
    const timestamp = Date.now();
    const uniqueId = uuidv4();
    const ext = path.extname(file.originalname);
    const name = path.basename(file.originalname, ext);
    const uniqueFilename = `${timestamp}-${uniqueId}-${name}${ext}`;
    cb(null, uniqueFilename);
  }
});

const upload = multer({ 
  storage: storage,
  limits: {
    fileSize: 10 * 1024 * 1024 // 10MB limit
  }
});

app.post('/api/upload', upload.single('file'), (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: 'No file uploaded' });
  }
  
  res.json({
    success: true,
    filename: req.file.filename,
    originalName: req.file.originalname,
    size: req.file.size,
    path: `/api/files/${req.file.filename}`
  });
});

app.get('/api/files', (req, res) => {
  fs.readdir(uploadsDir, (err, files) => {
    if (err) {
      return res.status(500).json({ error: 'Failed to read files directory' });
    }
    
    const actualFiles = files.filter(f => f !== '.gitkeep' && !f.startsWith('.'));
    
    const fileList = actualFiles.map(filename => {
      const filePath = path.join(uploadsDir, filename);
      const stats = fs.statSync(filePath);
      return {
        filename,
        size: stats.size,
        uploadedAt: stats.birthtime,
        url: `/api/files/${filename}`
      };
    });
    
    res.json({ files: fileList });
  });
});

app.get('/api/files/:name', (req, res) => {
  const filename = req.params.name;
  const filePath = path.join(uploadsDir, filename);
  
  // Security: prevent directory traversal
  if (!filePath.startsWith(uploadsDir)) {
    return res.status(403).json({ error: 'Access denied' });
  }
  
  if (!fs.existsSync(filePath)) {
    return res.status(404).json({ error: 'File not found' });
  }
  
  res.sendFile(filePath);
});

// 3D planner files are now served through GridFS via /api/threedplanner/files/:id endpoint

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
