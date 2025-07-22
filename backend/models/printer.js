const mongoose = require("mongoose"),
  Schema = mongoose.Schema;

const Branch = require('./branch');
const Paper = require('./paper');
const Order = require('./order');

const PrinterSchema = mongoose.Schema({
  model: String,
  name: String,
  location: String,
  ip: String,
  port: Number,
  branch: {
    type: Schema.ObjectId,
    ref: 'Branch'
  },
  number: Number,
  anydesk: String,
  status: {type: String, enum: ['idle', 'processing', 'offline', 'sleep', 'interaction', 'cleaning']},
  status_details: [String],
  price_factor: Number,
  queueStatus: {type: String, enum: ['working', 'idle', 'manual']},
  inkStatus: [{
    color: String,
    capacity: Number,
    level: Number,
    enableReplace: {type: Boolean},
  }],
  wasteInk: {
    level: Number,
    enableReplace: {type: Boolean},
  },
  inputBins: [{
    physicalInputBin: String,
    paperType: {type: Schema.ObjectId, ref: 'Paper'},
    status: {
      orientation: String,
      lingerPercent: Number,
      position: String,
      detection: Boolean,
      lingerLength: Number,
      paperNeeded: Number,
      enableReplace: {type: Boolean},
    },
    price_factor: Number,
  }],
  paperStatus: {type: String, enum: ['ok', 'not ok']},
  queue: [{type: Schema.ObjectId, ref: 'Order'}],
  printerQueue: [{type: Schema.ObjectId, ref: 'Order'}],
  safe: Boolean,
  stop: Boolean,
  printerJobsIds: [Number],
  currentOrder: {type: Schema.ObjectId, ref: 'Order'},
  lastPrintedAt: Date,
  lastOnlineAt: Date,
  lastSentAt: Date,
  serverAddress: String,
});

module.exports = mongoose.model("Printer", PrinterSchema);
