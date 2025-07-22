const mongoose = require("mongoose"),
    Schema = mongoose.Schema;

const productsSchema = new Schema({
    name: {
        type: String,
        required: true
    },
    textures: {
        type: Map,
        of: String,
        required: true
    },
    aspect: {
        type: Number,
        required: true
    },
    price: {
        type: Number,
        required: true
    },
    types: [{
        name: {
            type: String,
            required: true
        },
        price: {
            type: Number,
            required: true
        },
        width: {
            type: Number,
            required: true
        },
        height: {
            type: Number,
            required: true
        }
    }]
});

module.exports = mongoose.model("Product", productsSchema);