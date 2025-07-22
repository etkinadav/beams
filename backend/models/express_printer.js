
const mongoose = require('mongoose'),
  Schema = mongoose.Schema;

// const Branch = require('./branch');
const OrderExpress = require('./order-express');
const User = require('./user');
const FixProduct = require('./fix_product');

const ExpressPrinterSchema = mongoose.Schema({
  name: String,
  unique: Number,
  error: {
    type: Boolean,
    default: false
  },
  properties: {
    model: String,
    location: String,
    serial: String,
    mac: String,
    code: Number,
    slack_url: String,
    slack_channel: String,
    anydesk: String,
    cable_connected: {
      type: Boolean,
      default: false
    },
    close: {
      type: Boolean,
      default: false,
    },
    close_msg: {
      type: String,
      default: "",
    },
    enable_crop: {
      type: Boolean,
      default: true,
    },
  },
  printnode: {
    computer_id: Number,
    printer_id: Number,
  },
  consumables: {
    ink: [{
      name: String,
      level: Number,
    }],
    papers: [{
      dpi: String,
      bin: String,
      media: String,
      paperName: { type: String },
      enable_double_anyway: { type: Boolean, default: false },
      paperType: { type: String, enum: ['A4', 'A3', 'A5', 'CY-SM', 'CY-MD', 'CY-LG'] },
      paperCode: String,
      available: Boolean,
      price_factor: Number,
      maxInkLevel: {
        type: Number,
        default: 100
      }
    }],
  },
  pricing: {
    x: Number,
    prices: Object,
    prices_x: Object,
  },
  status: {
    internal_ip: String,
    status: String,
    status_code: Number,
    status_code_exp: String,
    err_reasons: [String],
    stop: Boolean,
    hide: Boolean,
    lastPrintedAt: Date,
    lastConnectedAt: Date,
    lastOnlineAt: Date,
    lastSentAt: Date,
    printnode_online: Boolean,
    printnode_last_online: Date,
    printed_pages: Number,
    printed_pages_unlock: Number,
    scans_made: {
      type: Number,
      default: 0
    },
    image: String,
  },
  scan: {
    intent: {
      type: String,
      enum: ['email', 'print']
    },
    scan_needed: Boolean,
    // scan_used: Boolean,
    last_scan_requested: Date,
    last_scan_completed: Date,
    userID: {
      type: Schema.ObjectId,
      ref: 'User'
    },
    scan: String,
    enabled: {
      type: Boolean,
      default: false
    },
  },
  queue: {
    queue: [{
      type: Schema.ObjectId,
      ref: 'OrderExpress'
    }],
    printerQueue: [{
      type: Schema.ObjectId,
      ref: 'OrderExpress'
    }],
    printerJobsIds: [Number],
    jobsInInternalQueue: [Number],
  },
  price_factor: Number,
  serial_name: {
    type: String,
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
  fix_products: [{
    productId: { type: Schema.Types.ObjectId, ref: 'Fix_Product' },
    hide: { type: Boolean, default: false },
    price: Number,
    stack: Number,
  }]
});

module.exports = mongoose.model("Express_printer", ExpressPrinterSchema);
