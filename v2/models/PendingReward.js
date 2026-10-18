const mongoose = require('mongoose');

const pendingRewardSchema = new mongoose.Schema({
    uid: {
        type: String,
        required: true,
        index: true
    },
    user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        default: null
    },
    amount: {
        type: Number,
        required: true,
        min: 1
    },
    status: {
        type: String,
        enum: ['pending', 'completed', 'cancelled'],
        default: 'pending',
        index: true
    },
    requestedAt: {
        type: Date,
        default: Date.now
    },
    executeAt: {
        type: Date,
        required: true,
        index: true
    },
    completedAt: {
        type: Date,
        default: null
    },
    error: {
        type: String,
        default: null
    }
}, {
    timestamps: true
});

// Compound index for worker polling: quickly find rewards due for execution
pendingRewardSchema.index({ status: 1, executeAt: 1 });

// Compound index to check existing pending claims per user
pendingRewardSchema.index({ uid: 1, status: 1 });

module.exports = mongoose.model('PendingReward', pendingRewardSchema);
