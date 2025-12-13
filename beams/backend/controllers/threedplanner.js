const ThreedPlannerFile = require('../models/threedplanner-file');
const mongoose = require('mongoose');
const { GridFSBucket } = require('mongodb');
const ObjectId = require('mongoose').Types.ObjectId;

// Get GridFS bucket
const getGridFSBucket = () => {
    const db = mongoose.connection.db;
    return new GridFSBucket(db, { bucketName: 'threedplannerfiles' });
};

// Get the base file info
exports.getBaseFile = async (req, res, next) => {
    try {
        const baseFile = await ThreedPlannerFile.findOne({ fileType: 'base' }).sort({ uploadedAt: -1 });
        
        if (baseFile) {
            res.status(200).json({
                success: true,
                baseFile: {
                    id: baseFile._id,
                    filename: baseFile.filename,
                    originalName: baseFile.originalName,
                    fileType: baseFile.fileType,
                    size: baseFile.size,
                    mimeType: baseFile.mimeType,
                    uploadedAt: baseFile.uploadedAt,
                    downloadUrl: `/api/threedplanner/files/${baseFile._id}`
                }
            });
        } else {
            res.status(200).json({
                success: true,
                baseFile: null
            });
        }
    } catch (error) {
        console.error('Error getting base file:', error);
        res.status(500).json({ 
            success: false,
            message: "Error getting base file", 
            error: error.message 
        });
    }
};

// Upload/Update the base file
exports.uploadBaseFile = async (req, res, next) => {
    try {
        if (!req.file) {
            return res.status(400).json({ 
                success: false,
                error: 'No file uploaded' 
            });
        }

        const gridFSBucket = getGridFSBucket();
        
        // Delete old base file if exists
        const oldBaseFile = await ThreedPlannerFile.findOne({ fileType: 'base' });
        if (oldBaseFile) {
            try {
                const oldGridfsId = new mongoose.Types.ObjectId(oldBaseFile.gridfsId);
                await gridFSBucket.delete(oldGridfsId);
                await ThreedPlannerFile.findByIdAndDelete(oldBaseFile._id);
            } catch (deleteError) {
                console.error('Error deleting old file:', deleteError);
                // Continue anyway
            }
        }

        // Upload new file to GridFS
        const uploadStream = gridFSBucket.openUploadStream(req.file.originalname, {
            metadata: {
                fileType: 'base',
                originalName: req.file.originalname,
                uploadedAt: new Date()
            }
        });

        // Store the upload ID before writing
        const gridfsFileId = uploadStream.id;

        // Write buffer to GridFS
        uploadStream.write(req.file.buffer);
        uploadStream.end();

        // Handle upload completion
        uploadStream.on('finish', async () => {
            try {
                // Save file metadata
                const fileMetadata = new ThreedPlannerFile({
                    filename: req.file.originalname,
                    originalName: req.file.originalname,
                    fileType: 'base',
                    gridfsId: gridfsFileId,
                    size: req.file.size,
                    mimeType: req.file.mimetype,
                    uploadedAt: new Date()
                });

                await fileMetadata.save();

                res.status(200).json({
                    success: true,
                    message: 'Base file uploaded successfully',
                    baseFile: {
                        id: fileMetadata._id,
                        filename: fileMetadata.filename,
                        originalName: fileMetadata.originalName,
                        fileType: fileMetadata.fileType,
                        size: fileMetadata.size,
                        mimeType: fileMetadata.mimeType,
                        uploadedAt: fileMetadata.uploadedAt,
                        downloadUrl: `/api/threedplanner/files/${fileMetadata._id}`
                    }
                });
            } catch (saveError) {
                console.error('Error saving file metadata:', saveError);
                // Try to delete the GridFS file if metadata save failed
                try {
                    const gridfsObjectId = new mongoose.Types.ObjectId(gridfsFileId);
                    await gridFSBucket.delete(gridfsObjectId);
                } catch (deleteError) {
                    console.error('Error cleaning up GridFS file:', deleteError);
                }
                if (!res.headersSent) {
                    res.status(500).json({
                        success: false,
                        message: "Error saving file metadata",
                        error: saveError.message
                    });
                }
            }
        });

        uploadStream.on('error', (error) => {
            console.error('Error uploading to GridFS:', error);
            if (!res.headersSent) {
                res.status(500).json({
                    success: false,
                    message: "Error uploading file to GridFS",
                    error: error.message
                });
            }
        });

    } catch (error) {
        console.error('Error uploading base file:', error);
        res.status(500).json({ 
            success: false,
            message: "Error uploading base file", 
            error: error.message 
        });
    }
};

// Download file by ID
exports.downloadFile = async (req, res, next) => {
    try {
        const fileId = req.params.id;
        
        if (!mongoose.Types.ObjectId.isValid(fileId)) {
            return res.status(400).json({
                success: false,
                error: 'Invalid file ID'
            });
        }

        const fileMetadata = await ThreedPlannerFile.findById(fileId);
        if (!fileMetadata) {
            return res.status(404).json({
                success: false,
                error: 'File not found'
            });
        }

        const gridFSBucket = getGridFSBucket();
        const downloadStream = gridFSBucket.openDownloadStream(fileMetadata.gridfsId);

        // Set response headers
        res.set({
            'Content-Type': fileMetadata.mimeType || 'application/octet-stream',
            'Content-Disposition': `attachment; filename="${fileMetadata.originalName}"`,
            'Content-Length': fileMetadata.size
        });

        downloadStream.on('error', (error) => {
            console.error('Error downloading file:', error);
            if (!res.headersSent) {
                res.status(500).json({
                    success: false,
                    error: 'Error downloading file'
                });
            }
        });

        downloadStream.pipe(res);

    } catch (error) {
        console.error('Error in downloadFile:', error);
        res.status(500).json({
            success: false,
            message: "Error downloading file",
            error: error.message
        });
    }
};
