const mongoose = require("mongoose");

const jobActionV2Schema = new mongoose.Schema({
    jobId: {
        type: String,
        required: true,
        ref: 'JobV2'
    },
    userId: {
        type: String,
        required: true
    },
    targetLink: {
        type: String,
        required: true
    },
    platform: {
        type: String,
        required: true
    },
    actionType: {
        type: String,
        required: true
    },
    status: {
        type: String,
        enum: ['pending', 'completed', 'completed_externally', 'failed', 'timeout'],
        default: 'pending'
    },
    reason: {
        type: String,
        default: ''
    },
    createdAt: {
        type: Date,
        default: Date.now
    }
});

// IMPORTANT COMPOUND INDEXES FOR PERFORMANCE
// 1. To quickly find if a user has interacted with a specific link (for filtering)
jobActionV2Schema.index({ targetLink: 1, userId: 1 }, { unique: true });

// 2. To quickly find all users who interacted with a specific job
jobActionV2Schema.index({ jobId: 1, userId: 1 });

// 3. For cleanup or timeouts of pending jobs
jobActionV2Schema.index({ status: 1, createdAt: 1 });

module.exports = mongoose.model('JobActionV2', jobActionV2Schema);
