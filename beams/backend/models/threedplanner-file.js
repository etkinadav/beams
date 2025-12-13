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
        enum: ['base', 'other'], // 'base' לקובץ הבסיס, 'other' לקבצים נוספים בעתיד
        default: 'base'
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

