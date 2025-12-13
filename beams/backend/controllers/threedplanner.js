const ThreedPlannerFile = require('../models/threedplanner-file');
const mongoose = require('mongoose');
const { GridFSBucket } = require('mongodb');
const ObjectId = require('mongoose').Types.ObjectId;

// Get GridFS bucket
const getGridFSBucket = () => {
    if (!mongoose.connection.db) {
        throw new Error('MongoDB connection not established');
    }
    const db = mongoose.connection.db;
    console.log('📦 Database name:', db.databaseName);
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
        console.log('📤 Upload request received');
        console.log('📤 req.file:', req.file);
        console.log('📤 req.body:', req.body);
        console.log('📤 req.headers:', req.headers['content-type']);
        
        if (!req.file) {
            console.error('❌ No file in request');
            console.error('❌ req.file is:', req.file);
            console.error('❌ req.body is:', req.body);
            return res.status(400).json({ 
                success: false,
                error: 'No file uploaded' 
            });
        }
        
        // Validate file type in controller instead of fileFilter
        const allowedExtensions = ['.obj', '.fbx', '.gltf', '.glb', '.dae', '.3ds', '.blend', '.stl', '.ply'];
        const fileNameParts = req.file.originalname.split('.');
        const ext = fileNameParts.length > 1 ? '.' + fileNameParts.pop().toLowerCase() : '';
        console.log('🔍 [Controller] File extension:', ext);
        
        if (!allowedExtensions.includes(ext)) {
            console.error('❌ [Controller] Invalid file type:', ext);
            return res.status(400).json({
                success: false,
                error: 'Invalid file type. Only 3D file formats are allowed (obj, fbx, gltf, glb, dae, 3ds, blend, stl, ply).'
            });
        }

        console.log('✅ File received:', req.file.originalname, 'Size:', req.file.size);

        const gridFSBucket = getGridFSBucket();
        console.log('✅ GridFS bucket created');
        
        // Delete old base file if exists
        const oldBaseFile = await ThreedPlannerFile.findOne({ fileType: 'base' });
        if (oldBaseFile) {
            console.log('🗑️ Deleting old base file:', oldBaseFile._id);
            try {
                const oldGridfsId = new mongoose.Types.ObjectId(oldBaseFile.gridfsId);
                await gridFSBucket.delete(oldGridfsId);
                await ThreedPlannerFile.findByIdAndDelete(oldBaseFile._id);
                console.log('✅ Old file deleted');
            } catch (deleteError) {
                console.error('❌ Error deleting old file:', deleteError);
                // Continue anyway
            }
        }

        // Upload new file to GridFS using Promise
        const uploadPromise = new Promise((resolve, reject) => {
            const uploadStream = gridFSBucket.openUploadStream(req.file.originalname, {
                metadata: {
                    fileType: 'base',
                    originalName: req.file.originalname,
                    uploadedAt: new Date()
                }
            });

            console.log('📝 Upload stream created, ID:', uploadStream.id);

            // Store the upload ID before writing
            const gridfsFileId = uploadStream.id;

            uploadStream.on('finish', async () => {
                console.log('✅ GridFS upload finished, ID:', gridfsFileId);
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

                    console.log('💾 Saving metadata to database...');
                    console.log('Metadata object:', JSON.stringify(fileMetadata.toObject(), null, 2));
                    const savedFile = await fileMetadata.save();
                    console.log('✅ Metadata saved, ID:', savedFile._id);
                    console.log('Saved file:', JSON.stringify(savedFile.toObject(), null, 2));

                    resolve(savedFile);
                } catch (saveError) {
                    console.error('❌ Error saving file metadata:', saveError);
                    console.error('Error message:', saveError.message);
                    console.error('Error stack:', saveError.stack);
                    // Try to delete the GridFS file if metadata save failed
                    try {
                        const gridfsObjectId = new mongoose.Types.ObjectId(gridfsFileId);
                        await gridFSBucket.delete(gridfsObjectId);
                        console.log('🗑️ GridFS file cleaned up');
                    } catch (deleteError) {
                        console.error('❌ Error cleaning up GridFS file:', deleteError);
                    }
                    reject(saveError);
                }
            });

            uploadStream.on('error', (error) => {
                console.error('❌ Error uploading to GridFS:', error);
                console.error('Error stack:', error.stack);
                reject(error);
            });

            // Write buffer to GridFS
            console.log('📤 Writing buffer to GridFS, buffer size:', req.file.buffer.length);
            uploadStream.end(req.file.buffer);
        });

        // Wait for upload to complete
        const savedFile = await uploadPromise;
        
        // Send response
        res.status(200).json({
            success: true,
            message: 'Base file uploaded successfully',
            baseFile: {
                id: savedFile._id,
                filename: savedFile.filename,
                originalName: savedFile.originalName,
                fileType: savedFile.fileType,
                size: savedFile.size,
                mimeType: savedFile.mimeType,
                uploadedAt: savedFile.uploadedAt,
                downloadUrl: `/api/threedplanner/files/${savedFile._id}`
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
