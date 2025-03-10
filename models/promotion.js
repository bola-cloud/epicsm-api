const mongoose = require('mongoose');

const PromotionSchema = new mongoose.Schema({
    start: {
        type: String,
    },
    end: {
        type: String,
    },
    timezone: {
        type: String,
    },
    active: {
        type: Boolean,
    },
    promotion_settings: {
        type: String,
    }
});

module.exports = mongoose.model('Promotion', PromotionSchema);
