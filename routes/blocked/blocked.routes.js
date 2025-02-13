const express = require("express");
const router = express.Router({ mergeParams: true });
const BlockedController = require("./blocked.controller");

router.get(
    '/',
    BlockedController.getLists
)


router.post(
    '/ap',
    BlockedController.addToBlockedAP
)

router.post(
    '/pl',
    BlockedController.addToBlockedPL
)

router.delete(
    '/:type/:value',
    BlockedController.DeleteID
)




module.exports = router;