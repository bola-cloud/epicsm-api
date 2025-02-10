const mongoose = require("mongoose")

const statistiqueSchema = new mongoose.Schema({
  userId: {
    type: String,
    required: true,
    index: true,
  },
  version: {
    type: String,
  },
  webview: {
    type: String,
  },
  connection: {
    type: String,
  },
  country: {
    type: String,
  },
  lastUsed: {
    type: Date,
    default: Date.now
  },
  deviceInfo: {
    type: Object,
    default: {}
  }
});

const Statistique = module.exports = mongoose.model('Statistique', statistiqueSchema)