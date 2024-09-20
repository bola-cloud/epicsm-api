const mongoose = require("mongoose")


const socialmediaSchema = mongoose.Schema({
    company: {
        type: String,
        required: true
    },
    link: {
        type: String,
        required: true
    },
    created: {
        type: Date,
        default: Date.now
    },
    uid: {
        type: String,
        required: true,
        unique: true
    },
    token: {
        type: String,
        required: true
    },
    username: {
        type: String,
        required: true
    },
    password: {
        type: String,
        required: true
    }
});

const Socialmedia = module.exports = mongoose.model('Account', socialmediaSchema)
