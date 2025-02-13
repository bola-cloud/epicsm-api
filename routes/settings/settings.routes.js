const express = require("express");
const router = express.Router({ mergeParams: true });
const SettingsController = require("./settings.controller");

router.get(
    '/',
    SettingsController.getSettings
)


router.post(
    '/',
    SettingsController.updateSettings
)


router.get('/methods', SettingsController.getMethods);

router.post('/methods', SettingsController.addMethod);

router.put('/methods/:id', SettingsController.updateMethod);

router.delete('/methods/:id', SettingsController.deleteMethod);



module.exports = router;