const mongoose = require("mongoose"),
    Schema = mongoose.Schema;

const productsSchema = new Schema({
    name: {
        type: String,
        required: true
    },
    matirials: {
        type: Object,
        required: false
    },
    params: {
        type: Array,
        required: false
    }
});

module.exports = mongoose.model("Product", productsSchema, "products");