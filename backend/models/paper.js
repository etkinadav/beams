
const mongoose = require('mongoose'),
    Schema = mongoose.Schema;

const PaperSchema = mongoose.Schema({
    paperName: String,
    paperDesc: String,
    paperWidth: Number,
    paperType: String,
    paperWeight: Number,
    paperPrinterCode: String,
    paperPrinterQuality: { type: Number, default: 3 },
    pricingPoints: [{
        min: Number,
        max: Number,
        price: Number,
        level: Number
    }],
    a3Const: Number,
    doubleA3Const: Number,
    regConst: Number
});

module.exports = mongoose.model('Paper', PaperSchema, 'papers');