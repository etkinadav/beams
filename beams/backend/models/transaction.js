'use strict';

/**
 * Module dependencies
 */
var mongoose = require('mongoose'),
  Schema = mongoose.Schema;

/**
 * Transaction Schema
 */
var TransactionSchema = new Schema({
  created: {
    type: Date,
    default: Date.now
  },
  responseText: String,
  responseCode: String,
  sum: Number,
  user: String,
  orderID: { type: Schema.ObjectId, ref: 'Order' },
  userID: { type: Schema.ObjectId, ref: 'User' },
  branchID: { type: Schema.ObjectId, ref: 'Branch' },
  printerID: { type: Schema.ObjectId, ref: 'Printer' },
}, { versionKey: false, usePushEach: true });

mongoose.model('Transaction', TransactionSchema);
