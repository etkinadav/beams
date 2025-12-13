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
  }
  // Temporarily removed fileFilter to debug
  // fileFilter: (req, file, cb) => {
  //   console.log('🔍 [Multer] File filter check:', {
  //     originalname: file.originalname,
  //     mimetype: file.mimetype
  //   });
  //   // Accept common 3D file formats
  //   const allowedExtensions = ['.obj', '.fbx', '.gltf', '.glb', '.dae', '.3ds', '.blend', '.stl', '.ply'];
  //   const fileNameParts = file.originalname.split('.');
  //   const ext = fileNameParts.length > 1 ? '.' + fileNameParts.pop().toLowerCase() : '';
  //   console.log('🔍 [Multer] Extracted extension:', ext);
  //   
  //   if (allowedExtensions.includes(ext)) {
  //     console.log('✅ [Multer] File type accepted');
  //     cb(null, true);
  //   } else {
  //     console.error('❌ [Multer] File type rejected:', ext);
  //     cb(new Error('Invalid file type. Only 3D file formats are allowed (obj, fbx, gltf, glb, dae, 3ds, blend, stl, ply).'));
  //   }
  // }
});

router.get("/base-file", threedPlannerController.getBaseFile);

// Upload route with error handling for multer
router.post("/base-file", (req, res, next) => {
  console.log('🔵 [Route] POST /base-file received');
  console.log('🔵 [Route] Request headers:', req.headers['content-type']);
  console.log('🔵 [Route] Request body keys:', Object.keys(req.body || {}));
  
  upload.single('file')(req, res, (err) => {
    if (err) {
      console.error('❌ [Route] Multer error:', err);
      console.error('❌ [Route] Error type:', err.constructor.name);
      console.error('❌ [Route] Error message:', err.message);
      console.error('❌ [Route] Error stack:', err.stack);
      
      if (err instanceof multer.MulterError) {
        console.error('❌ [Route] MulterError code:', err.code);
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
    
    console.log('✅ [Route] Multer processing completed');
    console.log('✅ [Route] req.file exists:', !!req.file);
    if (req.file) {
      console.log('✅ [Route] req.file details:', {
        originalname: req.file.originalname,
        size: req.file.size,
        mimetype: req.file.mimetype
      });
    }
    
    next();
  });
}, threedPlannerController.uploadBaseFile);

router.get("/machines", threedPlannerController.getMachines);

// Upload machine route
router.post("/machines", (req, res, next) => {
  console.log('🔵 [Route] POST /machines received');
  console.log('🔵 [Route] Request headers:', req.headers['content-type']);
  console.log('🔵 [Route] Request body keys:', Object.keys(req.body || {}));
  
  upload.single('file')(req, res, (err) => {
    if (err) {
      console.error('❌ [Route] Multer error:', err);
      
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
    
    console.log('✅ [Route] Multer processing completed');
    next();
  });
}, threedPlannerController.uploadMachine);

router.put("/machines/:id/color", threedPlannerController.updateMachineColor);
router.delete("/machines/:id", threedPlannerController.deleteMachine);

router.get("/files/:id", threedPlannerController.downloadFile);

router.post("/machine-config", threedPlannerController.addMachineConfig);
router.get("/machine-config", threedPlannerController.getMachineConfigs);
router.delete("/machine-config/:id", threedPlannerController.deleteMachineConfig);

module.exports = router;
