const mongoose = require('mongoose');

const settingsSchema = new mongoose.Schema({
    executionMethod: {
        type: String,
    },
    reportErrors: {
        type: Boolean,
        default: false
    },
    reportHtml: {
        type: Boolean,
        default: false
    },
    executionMethods: [{
        type: String
    }],
});

module.exports = mongoose.model('Settings', settingsSchema);