const bcrypt = require("bcryptjs")
const mongoose = require("mongoose")


const userSchema = mongoose.Schema({
    email: {
        type: String,
        require: true,
        unique: true
    },
    first_name: {
        type: String,
        require: false,
        default: "",

    },
    last_name: {
        type: String,
        require: false,
        default: "",

    },
    user_image: {
        type: String,
        require: false,
        default: "",

    },
    password: {
        type: String,
        require: true,
    },
    role: {
        type: String,
        require: true,
        default: "client",
    },
}, { timestamps: true })

const User = module.exports = mongoose.model('Admin', userSchema)

module.exports.createNewUser = async function (newUser) {
    // Check if a user with the same email allready exists
    if (await this.findUserByEmail(newUser.email)) return null

    const salt = await bcrypt.genSalt()
    newUser.password = await bcrypt.hash(newUser.password, salt)
    return await User(newUser).save()
}

module.exports.findUserByEmail = async function (email) {
    return await User.findOne({ email: email })
}

module.exports.isPassword = async function (hardcoded, hashed) {
    return await bcrypt.compare(hardcoded, hashed)
}
