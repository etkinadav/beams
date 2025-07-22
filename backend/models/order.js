const mongoose = require("mongoose"),
    Schema = mongoose.Schema;

const OrderSchema = new mongoose.Schema({
    created: {
        type: Date,
        default: Date.now
    },
    print_sent: Date,
    print_start: Date,
    print_end: Date,
    files: [{ type: Schema.ObjectId, ref: 'File' }],
    status: { type: String, enum: ['PENDING', 'PROCESSING', 'INQUEUE', 'PRINTERQUEUE', 'DONE', 'QR', 'NOT_PAID', 'EXPIRED', 'REFUNDED', 'ERROR'], default: 'NOT_PAID' },
    user: String,
    qrOrder: {
        type: Boolean,
        default: false
    },
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
    qrToken: String,
    qrLock: {
        type: Boolean,
        default: false
    },
    hasErrors: {
        type: Boolean,
        default: false
    },
    addedToQueue: Date,
    isPaid: Boolean,
    zCreditRef: String,
    zCreditCard: String,
    userID: { type: Schema.ObjectId, ref: 'User' },
    branchID: { type: Schema.ObjectId, ref: 'Branch' },
    printerID: { type: Schema.ObjectId, ref: 'Printer' },
    isArchived: Boolean,
    currentImage: { type: Number, default: 1 },
    totalOrderLength: Number,
    totalOrderLengthInMeters: Number,
    totalOrderDurationInMinutes: Number,
    needMail: { type: Boolean, default: true },
    isMinimal: { type: Boolean, default: false },
    alerts: {
        nep: { type: Boolean, default: false },
        stuck: { type: Boolean, default: false },
    },
    isDeleted: {
        type: Boolean,
        default: false
    },
});

module.exports = mongoose.model("Order", OrderSchema);
