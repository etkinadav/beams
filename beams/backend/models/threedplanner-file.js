const mongoose = require("mongoose"),
    Schema = mongoose.Schema;

const threedPlannerFileSchema = new Schema({
    filename: {
        type: String,
        required: true
    },
    originalName: {
        type: String,
        required: true
    },
    fileType: {
        type: String,
        required: true,
        enum: ['base', 'machine'], // 'base' לקובץ הבסיס, 'machine' למכונות
        default: 'base'
    },
    name: {
        type: String,
        required: false // רק למכונות
    },
    machineNumber: {
        type: Number,
        required: false // רק למכונות - מספר לפי סדר ההעלאה
    },
    color: {
        type: String,
        required: false, // רק למכונות - צבע במבנה hex (#RRGGBB)
        default: '#888888' // צבע ברירת מחדל
    },
    gridfsId: {
        type: Schema.Types.ObjectId,
        required: true,
        index: true
    },
    size: {
        type: Number,
        required: true
    },
    mimeType: {
        type: String
    },
    uploadedAt: {
        type: Date,
        default: Date.now
    }
}, { 
    timestamps: true,
    collection: 'threedplannerfiles'
});

// Index for faster queries by fileType
threedPlannerFileSchema.index({ fileType: 1 });

module.exports = mongoose.model("ThreedPlannerFile", threedPlannerFileSchema);

