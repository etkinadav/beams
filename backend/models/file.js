
const mongoose = require('mongoose'),
  Schema = mongoose.Schema;

const FileSchema = new mongoose.Schema({
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
  printerID: { type: Schema.ObjectId, ref: 'Printer' },
  isOrdered: { type: Boolean, default: false },
  images: [{
    sentToPrinter: {
      type: Boolean,
      default: false
    },
    errorInSend: {
      type: Boolean,
      default: false
    },
    page: Number,
    imageInOrder: Number,
    scale: Number,
    sawInkWarning: Boolean,
    sawSizeWarning: Boolean,
    imageName: String,
    imagePath: String,
    imageSize: Number,   // in bytes
    imageWidth: Number,  // in pixels
    imageHeight: Number, // in pixels
    thumbnailPath: String,
    rotatedThumbnailPath: String,
    rawPath: String,
    resizedPath: String,
    origResizedPath: String, // bu for resizing
    origImageSize: Number,   // bu for resizing
    origImageWidth: Number,  // bu for resizing
    origImageHeight: Number, // bu for resizing
    origImageDPI: Number, // bu for resizing
    inkCalculation: Number,
    price: Number,
    printSettings: {
      paperType: String,
      numOfCopies: { type: Number, default: 1 },
      bw: { type: Boolean, default: false },
      cmFromTop: { type: Boolean, default: false },
      centered: { type: Boolean, default: false },
      isRotated: Boolean
    }
  }]
}, { versionKey: false, usePushEach: true });

const File = mongoose.model('File', FileSchema);
module.exports = File;
