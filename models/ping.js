const mongoose = require("mongoose")

const pingSchema = mongoose.Schema({
    createdAt: {
        type: Date,
        required: true,
        default: Date.now
    },
    from: {
        type: String,
        default: "Android Service"
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


const Ping = module.exports = mongoose.model('Ping', pingSchema)