const bcrypt = require("bcryptjs")
const mongoose = require("mongoose")


const userSchema = mongoose.Schema({
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
    role: {
        type: String,
        require: true,
        default: "client",
    },
    isVip: {
        type: Boolean,
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

