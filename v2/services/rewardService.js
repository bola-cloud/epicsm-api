const PendingReward = require('../models/PendingReward');
const User = require('../../models/user');
const UserSyncService = require('./userSyncService');
const admin = require('firebase-admin');

class RewardService {
    /**
     * Mobile requests to claim daily reward
     */
    static async claimDailyReward(uid) {
        if (!uid) {
            throw new Error('User ID (uid) is required');
        }

        // 1. Fetch user from MongoDB, or lazy sync if not yet in Mongo
        let user = await User.findOne({ uid });
        if (!user || !user.migratedToV2) {
            user = await UserSyncService.syncSingleUser(uid);
        }

        if (!user) {
            return {
                success: false,
                status: 'not_found',
                message: 'المستخدم غير موجود'
            };
        }

        // 2. Check if user is banned
        if (user.banned) {
            return {
                success: false,
                status: 'banned',
                message: 'هذا الحساب محظور حالياً'
            };
        }

        // 3. Check for any currently pending reward
        const activePending = await PendingReward.findOne({
            uid: user.uid,
            status: { $in: ['pending', 'processing'] }
        });

        if (activePending) {
            const remainingSeconds = Math.max(0, Math.ceil((new Date(activePending.executeAt).getTime() - Date.now()) / 1000));
            return {
                success: true,
                alreadyPending: true,
                status: 'scheduled',
                amount: activePending.amount,
                waitSeconds: remainingSeconds,
                executeAt: activePending.executeAt,
                message: 'طلب المكافأة قيد المعالجة بالفعل'
            };
        }

        // 4. Check 24-hour Cooldown from last claimed reward
        if (user.lastClaimedRewardAt) {
            const cooldownHours = 24;
            const cooldownMs = cooldownHours * 60 * 60 * 1000;
            const elapsed = Date.now() - new Date(user.lastClaimedRewardAt).getTime();
            if (elapsed < cooldownMs) {
                const waitSeconds = Math.ceil((cooldownMs - elapsed) / 1000);
                return {
                    success: false,
                    onCooldown: true,
                    status: 'cooldown',
                    waitSeconds: waitSeconds,
                    message: 'تم استلام المكافأة اليومية بالفعل، يرجى الانتظار للمرة القادمة'
                };
            }
        }

        // 5. Global Settings for reward amount and delay
        const Settings = require('../../models/settings');
        const globalSettings = await Settings.findOne();
        const globalReward = globalSettings?.globalDailyReward || 50;
        const delayMinutes = globalSettings?.rewardDelayMinutes || parseInt(process.env.REWARD_DELAY_MINUTES, 10) || 30;
        const executeAt = new Date(Date.now() + delayMinutes * 60 * 1000);

        // Check if a Promotion is currently active (e.g. 100 points instead of default)
        const PromotionService = require('./promotionService');
        const activePromo = await PromotionService.getCurrentPromotion();
        const amount = activePromo ? activePromo.rewardValue : globalReward;

        const newPending = new PendingReward({
            uid: user.uid,
            user: user._id,
            amount: amount,
            status: 'pending',
            requestedAt: new Date(),
            executeAt: executeAt
        });

        await newPending.save();

        return {
            success: true,
            status: 'scheduled',
            amount: amount,
            waitSeconds: delayMinutes * 60,
            executeAt: executeAt,
            message: 'تم جدولة إضافة المكافأة بنجاح'
        };
    }

    /**
     * Background Worker function that processes due pending rewards
     * Called by CronTasks every minute
     */
    static async processDueRewards(io) {
        try {
            const now = new Date();
            // Fetch batch of due rewards
            const dueRewards = await PendingReward.find({
                status: 'pending',
                executeAt: { $lte: now }
            }).limit(100);

            if (!dueRewards || dueRewards.length === 0) {
                return;
            }

            console.log(`[RewardService] Processing ${dueRewards.length} due rewards...`);

            for (const item of dueRewards) {
                // Atomic lock: transition status from pending to processing to avoid double runs
                const reward = await PendingReward.findOneAndUpdate(
                    { _id: item._id, status: 'pending' },
                    { $set: { status: 'processing' } },
                    { new: true }
                );

                if (!reward) continue; // Concurrently picked up by another tick

                try {
                    // Atomic balance increment in MongoDB
                    const updatedUser = await User.findOneAndUpdate(
                        { uid: reward.uid },
                        {
                            $inc: { dollars: reward.amount, coins: reward.amount },
                            $set: { lastClaimedRewardAt: new Date() }
                        },
                        { new: true }
                    );

                    if (!updatedUser) {
                        reward.status = 'cancelled';
                        reward.error = 'User not found in MongoDB';
                        await reward.save();
                        continue;
                    }

                    // Mark reward completed
                    reward.status = 'completed';
                    reward.completedAt = new Date();
                    await reward.save();

                    console.log(`[RewardService] Successfully credited ${reward.amount} points to user ${reward.uid}. New balance: ${updatedUser.dollars}`);

                    // 1. Live real-time notification via Socket.io if user is connected
                    if (io) {
                        io.to(reward.uid).emit('balance_updated', {
                            uid: reward.uid,
                            newBalance: updatedUser.dollars,
                            added: reward.amount,
                            reason: 'daily_reward'
                        });
                    }

                    // 2. Mobile Push Notification via FCM if user has a token
                    if (updatedUser.fcm) {
                        try {
                            await admin.messaging().send({
                                token: updatedUser.fcm,
                                notification: {
                                    title: 'تم استلام المكافأة اليومية! 🎁',
                                    body: `تمت إضافة ${reward.amount} نقطة إلى رصيدك. رصيدك الحالي: ${updatedUser.dollars}`
                                },
                                data: {
                                    type: 'reward_credited',
                                    amount: String(reward.amount),
                                    balance: String(updatedUser.dollars)
                                }
                            });
                        } catch (fcmError) {
                            // Non-fatal, just log token issue
                            console.warn(`[RewardService] FCM notification note for ${reward.uid}: ${fcmError.message}`);
                        }
                    }

                } catch (err) {
                    console.error(`[RewardService] Error processing reward ${reward._id}:`, err);
                    reward.status = 'pending'; // revert to pending to retry
                    reward.error = err.message;
                    await reward.save();
                }
            }
        } catch (error) {
            console.error('[RewardService] processDueRewards error:', error);
        }
    }
}

module.exports = RewardService;
