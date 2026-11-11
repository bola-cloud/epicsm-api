const User = require('../../models/user');
const authController = require('../authentication/authentication.controller');
const admin = require('firebase-admin');

// Ensure Firebase Admin is initialized
if (!admin.apps.length) {
    try {
        const serviceAccount = require('../../utils/epicsm-app-firebase-adminsdk-a6csy-58907dbb09.json');
        admin.initializeApp({
            credential: admin.credential.cert(serviceAccount)
        });
    } catch (err) {
        console.error('[NotificationController] Error initializing Firebase Admin:', err.message);
    }
}

/**
 * Get notification audience stats (total users, registered FCM device tokens)
 */
exports.getNotificationStats = async (req, res) => {
    try {
        const isUser = await authController.getUserByToken(req, res);
        if (!isUser) {
            return res.status(401).json({ message: 'Unauthorized' });
        }

        const totalUsers = await User.countDocuments();
        const usersWithFcmCount = await User.countDocuments({
            fcm: { $exists: true, $nin: ['', null] }
        });

        res.status(200).json({
            success: true,
            totalUsers,
            usersWithFcmCount
        });
    } catch (error) {
        console.error('[NotificationController] Error getting stats:', error);
        res.status(500).json({ success: false, message: 'Server error', error: error.message });
    }
};

/**
 * Broadcast notification to ALL users
 * Sends via:
 * 1. FCM Topic 'all_users'
 * 2. FCM Multicast to every registered token in MongoDB (in chunks of 500)
 * 3. Socket.io to all currently connected active clients
 */
exports.broadcastNotification = async (req, res) => {
    try {
        const isUser = await authController.getUserByToken(req, res);
        if (!isUser) {
            return res.status(401).json({ message: 'Unauthorized' });
        }

        const { title, body, imageUrl } = req.body;

        if (!title || !body) {
            return res.status(400).json({
                success: false,
                message: 'عنوان الإشعار ونص الرسالة مطلوبان (Title and body are required)'
            });
        }

        const cleanTitle = String(title).trim();
        const cleanBody = String(body).trim();

        const notificationPayload = {
            title: cleanTitle,
            body: cleanBody
        };

        if (imageUrl && typeof imageUrl === 'string' && imageUrl.startsWith('http')) {
            notificationPayload.imageUrl = imageUrl.trim();
        }

        // --- 1. Broadcast via Socket.io to connected users in real time ---
        try {
            const { getIO } = require('../../v2');
            const io = getIO();
            if (io) {
                io.emit('broadcast_notification', {
                    title: cleanTitle,
                    body: cleanBody,
                    imageUrl: notificationPayload.imageUrl || null,
                    timestamp: new Date()
                });
                console.log('[NotificationController] Broadcasted to online Socket.io clients');
            }
        } catch (socketErr) {
            console.warn('[NotificationController] Socket broadcast note:', socketErr.message);
        }

        // --- 2. Broadcast via FCM Topic (all_users / all) exclusively ---
        let topicSuccess = false;
        let messageId = null;

        try {
            // First attempt: Topic condition covering both 'all_users' and 'all'
            messageId = await admin.messaging().send({
                condition: "'all_users' in topics || 'all' in topics",
                notification: notificationPayload,
                data: {
                    title: cleanTitle,
                    body: cleanBody,
                    type: 'broadcast',
                    click_action: 'FLUTTER_NOTIFICATION_CLICK',
                    timestamp: new Date().toISOString()
                },
                android: {
                    priority: 'high',
                    notification: {
                        channelId: 'high_importance_channel',
                        sound: 'default'
                    }
                },
                apns: {
                    headers: {
                        'apns-priority': '10'
                    },
                    payload: {
                        aps: {
                            sound: 'default',
                            contentAvailable: true
                        }
                    }
                }
            });
            topicSuccess = true;
            console.log('[NotificationController] Broadcasted to topic: all_users / all, messageId:', messageId);
        } catch (conditionErr) {
            console.warn('[NotificationController] Condition broadcast failed, falling back to direct topic all_users:', conditionErr.message);
            try {
                messageId = await admin.messaging().send({
                    topic: 'all_users',
                    notification: notificationPayload,
                    data: {
                        title: cleanTitle,
                        body: cleanBody,
                        type: 'broadcast',
                        click_action: 'FLUTTER_NOTIFICATION_CLICK',
                        timestamp: new Date().toISOString()
                    },
                    android: {
                        priority: 'high',
                        notification: {
                            sound: 'default'
                        }
                    }
                });
                topicSuccess = true;
                console.log('[NotificationController] Fallback sent to topic: all_users, messageId:', messageId);
            } catch (topicErr) {
                console.error('[NotificationController] Topic send error:', topicErr.message);
                return res.status(500).json({
                    success: false,
                    message: 'فشل إرسال الإشعار عبر قناة البث العام (FCM Topic)',
                    error: topicErr.message
                });
            }
        }

        return res.status(200).json({
            success: true,
            message: 'تم إرسال الإشعار العام بنجاح لجميع المستخدمين عبر قناة البث (Topic: all_users)!',
            stats: {
                sendMethod: 'topic',
                topic: 'all_users',
                topicBroadcast: topicSuccess,
                messageId: messageId,
                sentAt: new Date().toISOString()
            }
        });
    } catch (error) {
        console.error('[NotificationController] Error in broadcastNotification:', error);
        return res.status(500).json({
            success: false,
            message: 'حدث خطأ أثناء إرسال الإشعار العام',
            error: error.message
        });
    }
};

/**
 * Send notification to a single specific user
 */
exports.sendToSpecificUser = async (req, res) => {
    try {
        const isUser = await authController.getUserByToken(req, res);
        if (!isUser) {
            return res.status(401).json({ message: 'Unauthorized' });
        }

        const { userId, title, body } = req.body;
        if (!userId || !title || !body) {
            return res.status(400).json({
                success: false,
                message: 'userId, title, and body are required'
            });
        }

        const query = userId.match(/^[0-9a-fA-F]{24}$/)
            ? { $or: [{ _id: userId }, { uid: userId }] }
            : { uid: userId };

        const user = await User.findOne(query);
        if (!user) {
            return res.status(404).json({ success: false, message: 'المستخدم غير موجود' });
        }

        if (!user.fcm) {
            return res.status(400).json({
                success: false,
                message: 'المستخدم ليس لديه رمز إشعارات (FCM Token) مسجل'
            });
        }

        const response = await admin.messaging().send({
            token: user.fcm,
            notification: {
                title: String(title).trim(),
                body: String(body).trim()
            },
            data: {
                type: 'direct',
                uid: user.uid,
                timestamp: new Date().toISOString()
            }
        });

        return res.status(200).json({
            success: true,
            message: `تم إرسال الإشعار للمستخدم ${user.name || user.email} بنجاح!`,
            messageId: response
        });
    } catch (error) {
        console.error('[NotificationController] Error sending to user:', error);
        return res.status(500).json({
            success: false,
            message: 'فشل إرسال الإشعار للمستخدم',
            error: error.message
        });
    }
};
