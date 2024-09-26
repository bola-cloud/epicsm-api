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

router.post(
    '/logout',
    authenticationController.logout
)

router.get(
    '/checktoken',
    authenticationController.checkTokenExpiration
)

module.exports = router;