const mongoose = require("mongoose");

const emailVerificationTokenSchema = mongoose.Schema({
  _userId: {
    type: mongoose.Schema.Types.ObjectId,
    required: true,
    ref: "User",
  },
  token: { type: String, required: true },
  createdAt: { type: Date, required: true, default: Date.now, expires: 43200 },
});


const EmailVerificationtoken = module.exports = mongoose.model('EmailVerificationtoken', emailVerificationTokenSchema);

module.exports.createNewEmailVerificationtoken = async function(newEmailVerificationtoken) {

  if (await this.findUserById(newEmailVerificationtoken._userId)) { 
    return await this.updateEmailVerificationtoken(newEmailVerificationtoken)
  } else {
    return await EmailVerificationtoken(newEmailVerificationtoken).save()
  }
  
}

module.exports.findEmailVerificationtokenById = async function(userId) {
  return await EmailVerificationtoken.findOne({_userId: userId})
}
module.exports. updateEmailVerificationtoken = async function(newEmailVerificationtoken) {
  return await EmailVerificationtoken.findByIdAndUpdate(newEmailVerificationtoken._userId,newEmailVerificationtoken)
}