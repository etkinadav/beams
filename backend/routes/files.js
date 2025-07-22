const express = require("express");

const FilesController = require("../controllers/file")
const checkAuth = require("../middleware/check-auth");
const checkAuthPrivate = require("../middleware/check-auth-private");

const router = express.Router();

// [plotter]
router.get("/filesforuser/:printerId/:userId", checkAuthPrivate, FilesController.getUserFiles);
// [express]
router.get("/filesforuserexpress/:userId", checkAuthPrivate, FilesController.getUserFilesExpress);

// [plotter]
router.put("/updatefilesettings/:fileId", checkAuthPrivate, FilesController.updateFileSettings);
// [express]
router.put("/updatefilesettingsexpress/:fileId", checkAuthPrivate, FilesController.updateFileSettingsExpress);
// [ph]
router.put("/updatefilesettingsph/:fileId", checkAuthPrivate, FilesController.updateFileSettingsPh);

// [express]
router.put("/clearfilesettingsexpress/:userId", checkAuthPrivate, FilesController.clearFilesSettingsExpress);

// [plotter]
router.put("/applytoall/:userId/:printerId", checkAuthPrivate, FilesController.applyToAllFilesSettings);
// [express]
router.put("/applytoallexpress/:userId", checkAuthPrivate, FilesController.applyToAllFilesSettingsExpress);

// [plotter]
router.delete("/deletefile/:fileId", checkAuthPrivate, FilesController.deleteFile);
// [express]
router.delete("/deletefileexpress/:fileId", checkAuthPrivate, FilesController.deleteFileExpress);

// [plotter]
router.delete("/deleteimage/:fileId/:imageIndex", checkAuthPrivate, FilesController.deleteImage);
// [express]
router.delete("/deleteimageexpress/:fileId/:imageIndex", checkAuthPrivate, FilesController.deleteImageExpress);

// [plotter]
router.delete("/deleteallfiles/:userId", checkAuthPrivate, FilesController.deleteAllFiles);
// [express]
router.delete("/deleteallfilesexpress/:userId", checkAuthPrivate, FilesController.deleteAllFilesExpress);

module.exports = router;