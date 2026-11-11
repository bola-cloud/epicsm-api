const bcrypt = require("bcryptjs")
const mongoose = require("mongoose")


const userSchema = mongoose.Schema({
    uid: {
        type: String,
        default: "",
        index: true,
    },
    email: {
        type: String,
        require: true,
        unique: true
    },
    nom: {
        type: String,
        require: false,
        default: "",

    },
    prenom: {
        type: String,
        require: false,
        default: "",

    },
    fcm: {
        type: String,
        require: false,
        default: "",

    },
    photo: {
        type: String,
        require: false,
        default: "",

    },
    provider: {
        type: String,
        require: false,
        default: "",
    },
    lastSignIn: {
        type: Date,
        require: false,
        default: Date.now
    },
    facebookCookies: {
        type: String,
        default: "",
    },
    instagramCookies: {
        type: String,
        default: "",
    },
    role: {
        type: String,
        require: true,
        default: "client",
    },
    isVip: {
        type: Boolean,
    },
    dollars: {
        type: Number,
        default: 0,
        min: 0,
    },
    coins: {
        type: Number,
        default: 0,
        min: 0,
    },
    dailyRewards: {
        type: Number,
        default: 25,
    },
    banned: {
        type: Boolean,
        default: false,
    },
    name: {
        type: String,
        default: "",
    },
    nameNormalized: {
        type: String,
        default: "",
        index: true,
    },
    lastClaimedRewardAt: {
        type: Date,
        default: null,
    },
    zeroBalanceAt: {
        type: Date,
        default: null,
    },
    rewardEligibleAt: {
        type: Date,
        default: null,
    },
    migratedToV2: {
        type: Boolean,
        default: false,
        index: true,
    },
    created: {
        type: Date,
        require: true,
        default: Date.now
    },
})

const User = module.exports = mongoose.model('User', userSchema)

module.exports.createNewUser = async function (newUser) {
    // Check if a user with the same email allready exists
    if (await this.findUserByEmail(newUser.email)) return null
    return await User(newUser).save()
}

module.exports.findUserByEmail = async function (email) {
    return await User.findOne({ email: email })
}

module.exports.isPassword = async function (hardcoded, hashed) {
    return await bcrypt.compare(hardcoded, hashed)
}

module.exports.banUser = async (user) => {
    return await user.update({ isBanned: true })
}

