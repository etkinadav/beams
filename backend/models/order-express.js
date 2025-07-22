const mongoose = require("mongoose"),
    Schema = mongoose.Schema;

const ExpressOrderSchema = new mongoose.Schema({
    created: {
        type: Date,
        default: Date.now
    },
    reprintMark: { type: Boolean, default: false },
    files: [{ type: Schema.ObjectId, ref: 'FileExpress' }],
    status: { type: String, enum: ['PROCESSING', 'INQUEUE', 'PRINTERQUEUE', 'DONE', 'PENDING', 'NOT_PAID', 'EXPIRED', 'REFUNDED', 'ERROR'], default: 'NOT_PAID' },
    user: String,
    adminOrder: {
        type: Boolean,
        default: false
    },
    businessOrder: {
        type: Boolean,
        default: false
    },
    totalCost: {
        type: Number,
        default: 0
    },
    discount: {
        type: Number,
        default: 0
    },
    pointsCost: {
        type: Number,
        default: 0
    },
    ccCost: {
        type: Number,
        default: 0
    },
    qrLock: {
        type: Boolean,
        default: false
    },
    printLater: {
        type: Boolean,
        default: false
    },
    addedToQueue: Date,
    zCreditRef: String,
    zCreditCard: String,
    userID: { type: Schema.ObjectId, ref: 'User' },
    branchID: { type: Schema.ObjectId, ref: 'Branch' },
    printerID: { type: Schema.ObjectId, ref: 'Express_printer' },
    totalOrderLength: Number,
    // totalOrderDurationInMinutes: Number,
    // needMail: {type: Boolean, default: true},
    isMinimal: {
        type: Boolean,
        default: false
    },
    isDeleted: {
        type: Boolean,
        default: false
    },
}, { collection: 'express_orders', usePushEach: true });

const OrderExpress = mongoose.model('OrderExpress', ExpressOrderSchema);
module.exports = OrderExpress;
