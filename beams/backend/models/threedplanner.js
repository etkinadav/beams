const mongoose = require("mongoose"),
    Schema = mongoose.Schema;

const threedPlannerSchema = new Schema({
    baseFile: {
        filename: String,
        originalName: String,
        path: String,
        size: Number,
        uploadedAt: {
            type: Date,
            default: Date.now
        }
    }
}, { 
    timestamps: true,
    // Ensure only one document exists
    collection: 'threedplanner'
});

// Static method to get or create the single document
threedPlannerSchema.statics.getOrCreate = async function() {
    let doc = await this.findOne();
    if (!doc) {
        doc = new this({});
        await doc.save();
    }
    return doc;
};

module.exports = mongoose.model("ThreedPlanner", threedPlannerSchema);

