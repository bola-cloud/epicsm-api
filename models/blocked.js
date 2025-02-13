const mongoose = require('mongoose');

const blockedSchema = new mongoose.Schema({
    blockedAP: [{
        type: String,
        validate: {
            validator: function (v) {
                return /^[A-Za-z0-9]{28}$/.test(v);
            },
            message: props => `${props.value} is not a valid Firebase UID!`
        }
    }],
    blockedPL: [{
        type: String,
        validate: {
            validator: function (v) {
                return /^[A-Za-z0-9]{28}$/.test(v);
            },
            message: props => `${props.value} is not a valid Firebase UID!`
        }
    }],
});

module.exports = mongoose.model('Blocked', blockedSchema);