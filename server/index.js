const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { v4: uuidv4 } = require('uuid');

const app = express();
const PORT = process.env.PORT || 3000;

// Ensure uploads directory exists
const uploadsDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadsDir);
  },
  filename: (req, file, cb) => {
    // Generate unique filename: timestamp-uuid-originalname
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

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// API Routes
app.get('/api/health', (req, res) => {
  res.json({ ok: true });
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
    
    // Filter out .gitkeep and other hidden files
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

// Serve Angular app in production
if (process.env.NODE_ENV === 'production') {
  // Angular build output path (based on angular.json: dist/mean-corse-01)
  // Check for both possible structures (Angular 17+ uses /browser subdirectory)
  const possiblePaths = [
    path.join(__dirname, '..', 'dist', 'mean-corse-01', 'browser'),
    path.join(__dirname, '..', 'dist', 'mean-corse-01')
  ];
  
  let staticPath = null;
  for (const possiblePath of possiblePaths) {
    if (fs.existsSync(possiblePath)) {
      staticPath = possiblePath;
      break;
    }
  }
  
  if (staticPath) {
    // Serve static files
    app.use(express.static(staticPath));
    
    // SPA fallback: all non-API routes return index.html
    app.get('*', (req, res) => {
      if (!req.path.startsWith('/api')) {
        res.sendFile(path.join(staticPath, 'index.html'));
      } else {
        res.status(404).json({ error: 'Not found' });
      }
    });
  } else {
    console.warn('Warning: Angular build not found. Make sure to run "npm run build" before starting in production mode.');
  }
}

// Start server
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  if (process.env.NODE_ENV === 'production') {
    console.log('Production mode: serving Angular app');
  } else {
    console.log('Development mode: API only');
  }
});

