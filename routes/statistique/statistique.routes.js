const express = require("express");
const router = express.Router({ mergeParams: true });
const StatistiquesController = require("./statistique.controller");


router.post(
    '/version',
    StatistiquesController.RecordVersion
)

router.get(
    '/version',
    StatistiquesController.GetVersionStatistics
)

router.get(
    '/webview',
    StatistiquesController.GetWebviewStatistics
)


router.get(
    '/country',
    StatistiquesController.GetCountryStatistics
)

router.get(
    '/connection',
    StatistiquesController.GetConnectionStatistics
)

router.get(
    '/user-version/:userId',
    StatistiquesController.GetUserVersion
)


module.exports = router;