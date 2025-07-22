const mongoose = require("mongoose"),
    Schema = mongoose.Schema;

const User = require('./user');
const Printer = require('./printer');

const branchSchema = mongoose.Schema({
    name: {
        type: String,
        required: true
    },
    close: {
        type: Boolean,
        default: false,
    },
    hide: {
        type: Boolean,
        default: false,
    },
    close_msg: {
        type: String,
    },
    downgraded: {
        type: Boolean,
        default: false,
    },
    inform_slack_of_new_orders: {
        type: Boolean,
        default: false
    },
    domain: {
        type: String,
    },
    slack_url: {
        type: String,
    },
    email: String,
    location: String,
    sort: Number,
    isPlotter: {
        type: Boolean,
        default: true,
    },
    is_express: {
        type: Boolean,
        default: false
    },
    printers: [{
        type: Schema.ObjectId,
        ref: 'Printer'
    }],
    branchLogo: {
        type: String,
        // required: true
    },
    bm: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    },
    st: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        default: []
    }],
    stockCurrent: {
        paper: Schema.Types.Mixed,
        ink: Schema.Types.Mixed
    },
    stockNeeded: {
        paper: Schema.Types.Mixed,
        ink: Schema.Types.Mixed
    },
    serial_name: {
        type: String,
    },
    unique: String,
});

module.exports = mongoose.model("Branch", branchSchema);
