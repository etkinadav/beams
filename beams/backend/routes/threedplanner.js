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
    // Accept common 3D file formats
    const allowedExtensions = ['.obj', '.fbx', '.gltf', '.glb', '.dae', '.3ds', '.blend', '.stl', '.ply'];
    const ext = '.' + file.originalname.split('.').pop().toLowerCase();
    if (allowedExtensions.includes(ext)) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type. Only 3D file formats are allowed.'));
    }
  }
});

router.get("/base-file", threedPlannerController.getBaseFile);
router.post("/base-file", upload.single('file'), threedPlannerController.uploadBaseFile);
router.get("/files/:id", threedPlannerController.downloadFile);

module.exports = router;
