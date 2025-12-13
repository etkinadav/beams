const express = require("express");
const router = express.Router();
const multer = require("multer");

const threedPlannerController = require("../controllers/threedplanner");

// Configure multer for memory storage (to upload to GridFS)
const storage = multer.memoryStorage();

const upload = multer({ 
  storage: storage,
  limits: {
    fileSize: 100 * 1024 * 1024 // 100MB limit for 3D files
  },
  fileFilter: (req, file, cb) => {
    console.log('🔍 [Multer] File filter check:', {
      originalname: file.originalname,
      mimetype: file.mimetype
    });
    // Accept common 3D file formats
    const allowedExtensions = ['.obj', '.fbx', '.gltf', '.glb', '.dae', '.3ds', '.blend', '.stl', '.ply'];
    const fileNameParts = file.originalname.split('.');
    const ext = fileNameParts.length > 1 ? '.' + fileNameParts.pop().toLowerCase() : '';
    console.log('🔍 [Multer] Extracted extension:', ext);
    
    if (allowedExtensions.includes(ext)) {
      console.log('✅ [Multer] File type accepted');
      cb(null, true);
    } else {
      console.error('❌ [Multer] File type rejected:', ext);
      cb(new Error('Invalid file type. Only 3D file formats are allowed (obj, fbx, gltf, glb, dae, 3ds, blend, stl, ply).'));
    }
  }
});

router.get("/base-file", threedPlannerController.getBaseFile);

// Upload route with error handling for multer
router.post("/base-file", (req, res, next) => {
  upload.single('file')(req, res, (err) => {
    if (err) {
      console.error('❌ Multer error:', err);
      if (err instanceof multer.MulterError) {
        if (err.code === 'LIMIT_FILE_SIZE') {
          return res.status(400).json({
            success: false,
            error: 'File too large. Maximum size is 100MB'
          });
        }
      }
      return res.status(400).json({
        success: false,
        error: err.message || 'File upload error'
      });
    }
    next();
  });
}, threedPlannerController.uploadBaseFile);

router.get("/files/:id", threedPlannerController.downloadFile);

module.exports = router;
