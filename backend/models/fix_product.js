
const mongoose = require('mongoose'),
  Schema = mongoose.Schema;

const FixProductSchema = mongoose.Schema({
  name: String,
  defaultPrice: Number,
  previewImage: String,
  code: Number,
});

module.exports = mongoose.model("Fix_Product", FixProductSchema);
