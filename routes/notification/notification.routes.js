const express = require('express');
const router = express.Router({ mergeParams: true });
const notificationController = require('./notification.controller');

// GET /api/v4/notifications/stats or /api/v3/notifications/stats
router.get('/stats', notificationController.getNotificationStats);

// POST /api/v4/notifications/broadcast (Broadcast to ALL users)
router.post('/broadcast', notificationController.broadcastNotification);

// POST /api/v4/notifications/send-user (Send to a specific user)
router.post('/send-user', notificationController.sendToSpecificUser);

module.exports = router;
