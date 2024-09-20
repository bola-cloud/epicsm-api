const express = require("express");
const router = express.Router({ mergeParams: true });
const SocialMediaController = require("./socialmedia.controller");


router.get(
    '/',
    SocialMediaController.GetAccounts
)

router.get(
    '/:id',
    SocialMediaController.GetAccountByID
)

router.delete(
    '/:id',
    SocialMediaController.DeleteAccount
)


module.exports = router;