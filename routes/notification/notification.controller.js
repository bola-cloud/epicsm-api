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

        const { sendMethod } = req.body;
        // Default to topic broadcast ('all_users') as recommended by FCM to prevent duplicates
        const method = sendMethod === 'tokens' ? 'tokens' : 'topic';

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

        let totalSuccess = 0;
        let totalFailure = 0;
        let topicSuccess = false;

        // --- 2. Send via FCM: Either Topic OR Tokens (NEVER BOTH to avoid duplicate notifications) ---
        if (method === 'topic') {
            try {
                const response = await admin.messaging().send({
                    topic: 'all_users',
                    notification: notificationPayload,
                    data: {
                        type: 'broadcast',
                        click_action: 'FLUTTER_NOTIFICATION_CLICK',
                        timestamp: new Date().toISOString()
                    }
                });
                topicSuccess = true;
                totalSuccess = 1;
                console.log('[NotificationController] Sent single broadcast to topic: all_users, messageId:', response);
            } catch (topicErr) {
                console.error('[NotificationController] Topic send error:', topicErr.message);
                return res.status(500).json({
                    success: false,
                    message: 'فشل إرسال الإشعار عبر قناة البث العام',
                    error: topicErr.message
                });
            }

            return res.status(200).json({
                success: true,
                message: 'تم إرسال الإشعار العام بنجاح عبر قناة (Topic: all_users) دون تكرار!',
                stats: {
                    sendMethod: 'topic',
                    topic: 'all_users',
                    topicBroadcast: topicSuccess,
                    sentAt: new Date()
                }
            });
        } else {
            // Direct Multicast to stored device tokens
            const usersWithFcm = await User.find(
                { fcm: { $exists: true, $nin: ['', null] } },
                'fcm'
            );

            const rawTokens = usersWithFcm.map(u => u.fcm);
            const uniqueTokens = [...new Set(rawTokens.filter(t => typeof t === 'string' && t.trim().length > 10))];

            console.log(`[NotificationController] Preparing direct multicast for ${uniqueTokens.length} unique device tokens...`);

            const BATCH_SIZE = 500;
            const batches = [];
            for (let i = 0; i < uniqueTokens.length; i += BATCH_SIZE) {
                batches.push(uniqueTokens.slice(i, i + BATCH_SIZE));
            }

            const CONCURRENCY = 5;
            for (let i = 0; i < batches.length; i += CONCURRENCY) {
                const currentBatches = batches.slice(i, i + CONCURRENCY);
                await Promise.all(
                    currentBatches.map(async (batch) => {
                        try {
                            const response = await admin.messaging().sendEachForMulticast({
                                tokens: batch,
                                notification: notificationPayload,
                                data: {
                                    type: 'broadcast',
                                    click_action: 'FLUTTER_NOTIFICATION_CLICK',
                                    timestamp: new Date().toISOString()
                                }
                            });
                            totalSuccess += response.successCount;
                            totalFailure += response.failureCount;
                        } catch (batchErr) {
                            console.error('[NotificationController] Batch send error:', batchErr.message);
                            totalFailure += batch.length;
                        }
                    })
                );
            }

            return res.status(200).json({
                success: true,
                message: `تم إرسال الإشعار بنجاح إلى ${totalSuccess} جهاز عبر الرموز المباشرة (Tokens)!`,
                stats: {
                    sendMethod: 'tokens',
                    totalTargetTokens: uniqueTokens.length,
                    successCount: totalSuccess,
                    failureCount: totalFailure,
                    sentAt: new Date()
                }
            });
        }
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
