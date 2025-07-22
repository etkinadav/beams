
const mongoose = require('mongoose'),
    Schema = mongoose.Schema;

const ExpressFileSchema = new mongoose.Schema({
    created: {
        type: Date,
        default: Date.now
    },
    user: String,
    userID: { type: Schema.ObjectId, ref: 'User' },
    fileType: { type: String },
    fileSize: Number, // in bytes
    filePath: String,
    fileName: String,
    pdfPath: String,
    // printerID: { type: Schema.ObjectId || null, ref: 'Printer' },
    // orderID: { type: Schema.ObjectId, ref: 'Order' },
    isOrdered: { type: Boolean, default: false },
    isPacked: { type: Boolean, default: false },
    printSettings: {
        excluded: [Number],
        paperType: String,
        numOfCopies: { type: Number, default: 1 },
        bw: { type: Boolean, default: false },
        fit: { type: Boolean, default: false },
        doubleSided: { type: Boolean, default: false },
        isRotated: { type: Boolean, default: false },
        cropRatio: { type: Boolean, default: true }
    },
    sentToPrinter: {
        type: Boolean,
        default: false
    },
    sawSizeWarning: { type: Boolean, default: false },
    price: Number,
    images: [{
        page: Number,
        imageInOrder: Number,
        imageName: String,
        imagePath: String,
        imageWidth: Number,  // in pixels
        imageHeight: Number, // in pixels
        inkLevel: Number,
        thumbnailPath: String,
    }],
    remote_id: Number,
    done: Boolean,
    left_internal_queue: { type: Boolean, default: false },
}, { collection: 'express_files', versionKey: false, usePushEach: true });

const FileExpress = mongoose.model('FileExpress', ExpressFileSchema);
module.exports = FileExpress;
