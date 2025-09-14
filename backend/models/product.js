const mongoose = require("mongoose"),
    Schema = mongoose.Schema;

const paramSchema = new Schema({
    name: String,
    type: String,
    default: Schema.Types.Mixed,
    min: Number,
    max: Number,
    round: Number,
    beams: [{ type: Schema.Types.ObjectId, ref: 'Beam' }]
}, { _id: false });

const productsSchema = new Schema({
    name: {
        type: String,
        required: true
    },
    matirials: {
        type: Object,
        required: false
    },
    params: [paramSchema],
    restrictions: {
        type: Array,
        required: true
    }
});

module.exports = mongoose.model("Product", productsSchema, "products");