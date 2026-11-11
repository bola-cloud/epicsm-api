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
    mimicScroll: {
        type: Boolean,
        default: false
    },
    rt: {
        type: Number,
        default: 0
    },
    rrt: {
        type: Number,
        default: 0
    },
    globalDailyReward: {
        type: Number,
        default: 25
    },
    rewardDelayMinutes: {
        type: Number,
        default: 30
    },
    pointsPerDollar: {
        type: Number,
        default: 100
    },
    dictionary: {
        type: Map,
        of: [{
            type: String
        }],
        default: new Map()
    }
});

module.exports = mongoose.model('Settings', settingsSchema);