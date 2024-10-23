const mongoose = require("mongoose")
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

const jobSchema = mongoose.Schema({
    createdAt: {
        type: Date,
        required: true,
        default: Date.now
    },
    datePublished: {
        type: Date,
        required: true,
        default: Date.now
    },
    finishDate: {
        type: Date,
        default: null
    },
    isLive: {
        type: Boolean,
        required: true,
        default: true
    },
    jobId: {
        type: String,
        default: generateID,
    },
    likeCount: {
        type: Number,
        default: 0
    },
    link: {
        type: String,
        required: true
    },
    linkTypeId: {
        type: Number,
    },
    linkTypeName: {
        type: String,
    },
    maxCount: {
        type: Number,
    },
    platform: {
        type: String,
    },
    status: {
        type: String,
        required: true,
        default: "Active"
    },
    type: {
        type: String,
        default: null
    },
    country: {
        type: String,
        default: "all"
    },
    uid: {
        type: String,
        default: "----admin----",
        unique: false
    }

});


const Job = module.exports = mongoose.model('Job', jobSchema)