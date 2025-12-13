const mongoose = require("mongoose"),
    Schema = mongoose.Schema;

const threedPlannerMachineConfigSchema = new Schema({
    machineId: {
        type: Schema.Types.ObjectId,
        required: true,
        ref: 'ThreedPlannerFile'
    },
    pointX: {
        type: Number,
        required: true
    },
    pointY: {
        type: Number,
        required: true
    },
    pointZ: {
        type: Number,
        required: true
    },
    corner: {
        type: Number,
        required: true,
        enum: [1, 2, 3, 4], // 1 = top-left, 2 = top-right, 3 = bottom-left, 4 = bottom-right
        min: 1,
        max: 4
    },
    createdAt: {
        type: Date,
        default: Date.now
    }
}, { 
    timestamps: true,
    collection: 'threedplannermachineconfigs'
});

// Index for faster queries
threedPlannerMachineConfigSchema.index({ machineId: 1 });
threedPlannerMachineConfigSchema.index({ pointX: 1, pointY: 1, pointZ: 1 });

module.exports = mongoose.model("ThreedPlannerMachineConfig", threedPlannerMachineConfigSchema);

