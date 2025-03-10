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

router.get('/dictionary', SettingsController.getDictionaryEntries);

router.post('/dictionary', SettingsController.addDictionaryEntry);

router.put('/dictionary', SettingsController.updateDictionaryEntry);

router.delete('/dictionary/:key', SettingsController.deleteDictionaryEntry);

router.get('/dictionary/mobile', SettingsController.getDictionary);

module.exports = router;