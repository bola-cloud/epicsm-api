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
});

module.exports = mongoose.model('Promotion', PromotionSchema);
