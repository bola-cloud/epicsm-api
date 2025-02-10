const mongoose = require('mongoose');

const logSchema = new mongoose.Schema({
    userId: {
        type: String,
        required: true,
        index: true
    },
    type: {
        type: String,
        enum: ['Error', 'Warning', 'Info'],
        required: true
    },
    content: {
        type: String,
        required: true
    },
    timestamp: {
        type: Date,
        default: Date.now,
        index: true
    }
});

logSchema.index({ userId: 1, timestamp: -1 });

const Log = mongoose.model('Log', logSchema);
module.exports = Log;