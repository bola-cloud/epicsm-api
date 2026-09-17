const mongoose = require("mongoose");
const { v4: uuidv4 } = require('uuid');

const generateID = () => {
    const length = 24;
    const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let result = '';
    for (let i = 0; i < length; i++) {
        result += characters.charAt(Math.floor(Math.random() * characters.length));
    }
    return result;
};

const jobV2Schema = new mongoose.Schema({
    jobId: {
        type: String,
        default: generateID,
        unique: true
    },
    targetLink: {
        type: String,
        required: true
    },
    platform: {
        type: String,
        enum: ['instagram', 'facebook', 'tiktok', 'twitter', 'youtube'],
        required: true
    },
    actionType: {
        type: String,
        enum: ['like', 'follow', 'comment', 'view', 'share'],
        required: true
    },
    linkTypeName: {
        type: String,
        default: null
    },
    type: {
        type: String,
        default: null
    },
    maxCount: {
        type: Number,
        required: true
    },
    likeCount: { // Acted count
        type: Number,
        default: 0
    },
    isVip: {
        type: Boolean,
        default: false,
    },
    target_id: { // For Facebook
        type: String,
        default: null,
    },
    mediaId: { // For Instagram Like
        type: String,
        default: null,
    },
    userPk: { // For Instagram Follow
        type: String,
        default: null,
    },
    resolutionStatus: {
        type: String,
        enum: ['resolved', 'pending', 'failed', 'fallback'],
        default: 'resolved'
    },
    resolutionError: {
        type: String,
        default: null
    },
    status: {
        type: String,
        enum: ['Active', 'Completed', 'Paused', 'Cancelled'],
        default: "Active"
    },
    country: {
        type: String,
        default: "all"
    },
    creatorId: {
        type: String,
        default: "----admin----",
    },
    comments: {
        type: [String],
        default: [],
    },
    nextRefillAttempt: {
        type: Date,
        default: null
    },
    refillAttempts: {
        type: Number,
        default: 0
    },
    createdAt: {
        type: Date,
        default: Date.now
    }
});

// Indexes for fast lookup
jobV2Schema.index({ status: 1, isVip: 1, maxCount: 1 });
jobV2Schema.index({ nextRefillAttempt: 1 }, { partialFilterExpression: { status: 'Active' } });

module.exports = mongoose.model('JobV2', jobV2Schema);
