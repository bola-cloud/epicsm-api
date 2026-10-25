const mongoose = require('mongoose');

const PromotionSchema = new mongoose.Schema({
    title: {
        type: String,
        default: 'Happy Hour'
    },
    start: {
        type: String,
        default: '16:00'
    },
    end: {
        type: String,
        default: '19:00'
    },
    timezone: {
        type: String,
        default: 'Africa/Cairo'
    },
    active: {
        type: Boolean,
        default: true
    },
    rewardValue: {
        type: Number,
        default: 100
    },
    promotion_settings: {
        type: String,
        default: '100'
    },
    createdAt: {
        type: Date,
        default: Date.now
    }
});

module.exports = mongoose.model('Promotion', PromotionSchema);

