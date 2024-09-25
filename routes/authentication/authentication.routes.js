const express = require("express");
const router = express.Router({ mergeParams: true });
const authenticationController = require('./authentication.controller')


router.post(
    '/login',
    authenticationController.emailToLowerCase,
    // Authentication
    authenticationController.validateLoginBody,
    authenticationController.getUserFromEmail,
    authenticationController.checkPassword,
    // Generate JWT
    authenticationController.createToken,
    //authenticationController.sendTokens
    //return user and token in response
    authenticationController.sendUser
)

router.get(
    '/me',
    authenticationController.getMyProfile,
)


router.post(
    '/logout',
    authenticationController.logout
)

module.exports = router;