const mongoose = require("mongoose");
const Schema = mongoose.Schema;


const beamSchema = new Schema({
    name: {
        type: String,
        required: true
    },
    types: [
        {
            name: { type: String, required: true },
            length: [
                {
                    length: { type: Number, required: true },
                    price: { type: Number, required: true }
                }
            ]
        }
    ],
    height: {
        type: Number,
        required: true
    },
    width: {
        type: Number,
        required: true
    }
});

module.exports = mongoose.model("Beam", beamSchema);
