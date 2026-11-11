const User = require('../../models/user');
const UserSyncService = require('./userSyncService');
const admin = require('firebase-admin');

class RewardService {
    /**
     * Helper to compute reward status for profile and auth sync
     * Returns: { status: 'has_points' | 'waiting_timer' | 'ready_to_claim', canClaim, rewardAmount, waitSeconds, eligibleAt, message }
     */
    static async getRewardStatus(user) {
        if (!user) {
            return {
                status: 'not_found',
                canClaim: false,
                rewardAmount: 0,
                waitSeconds: 0,
                eligibleAt: null,
                message: 'المستخدم غير موجود'
            };
        }

        const Settings = require('../../models/settings');
        const globalSettings = await Settings.findOne();
        const globalReward = globalSettings?.globalDailyReward !== undefined ? Number(globalSettings.globalDailyReward) : 25;
        const delayMinutes = globalSettings?.rewardDelayMinutes || parseInt(process.env.REWARD_DELAY_MINUTES, 10) || 30;

        const PromotionService = require('./promotionService');
        const activePromo = await PromotionService.getCurrentPromotion();
        const rewardAmount = activePromo ? activePromo.rewardValue : globalReward;

        const coins = Number(user.coins || 0);

        // Case 1: User still has points (> 0)
        // Rule: User CANNOT claim rewards while they still have points left.
        if (coins > 0) {
            return {
                status: 'has_points',
                canClaim: false,
                rewardAmount,
                waitSeconds: 0,
                eligibleAt: null,
                message: 'لديك نقاط متبقية، يجب استنفاد نقاطك أولاً لتفعيل المكافأة'
            };
        }

        // Case 2: User points are 0
        // Check if reward countdown timer is set
        let eligibleAt = user.rewardEligibleAt;

        // If not set yet (e.g. new user or just reached 0 points), start the timer now
        if (!eligibleAt) {
            eligibleAt = new Date(Date.now() + delayMinutes * 60 * 1000);
            user.rewardEligibleAt = eligibleAt;
            user.zeroBalanceAt = user.zeroBalanceAt || new Date();
            await User.updateOne(
                { _id: user._id },
                { $set: { rewardEligibleAt: eligibleAt, zeroBalanceAt: user.zeroBalanceAt } }
            );
        }

        const now = Date.now();
        const eligibleTime = new Date(eligibleAt).getTime();

        if (now < eligibleTime) {
            // Case 2A: Timer is still running (waiting_timer)
            const remainingSeconds = Math.max(0, Math.ceil((eligibleTime - now) / 1000));
            return {
                status: 'waiting_timer',
                canClaim: false,
                rewardAmount,
                waitSeconds: remainingSeconds,
                eligibleAt,
                message: `متبقي ${Math.ceil(remainingSeconds / 60)} دقيقة لاسترداد المكافأة`
            };
        }

        // Case 2B: Timer finished and points are 0 (ready_to_claim)
        return {
            status: 'ready_to_claim',
            canClaim: true,
            rewardAmount,
            waitSeconds: 0,
            eligibleAt,
            message: 'المكافأة جاهزة للاسترداد الآن!'
        };
    }

    /**
     * Triggered when a user places an order that brings their balance to 0
     * Automatically initiates the countdown timer
     */
    static async triggerZeroBalance(uid) {
        if (!uid) return null;

        const Settings = require('../../models/settings');
        const globalSettings = await Settings.findOne();
        const delayMinutes = globalSettings?.rewardDelayMinutes || parseInt(process.env.REWARD_DELAY_MINUTES, 10) || 30;
        const eligibleAt = new Date(Date.now() + delayMinutes * 60 * 1000);

        await User.updateOne(
            { uid, coins: { $lte: 0 }, rewardEligibleAt: null },
            { $set: { zeroBalanceAt: new Date(), rewardEligibleAt: eligibleAt } }
        );

        return eligibleAt;
    }

    /**
     * Mobile requests to claim reward
     * Conditions:
     * 1. User must exist and not be banned
     * 2. User's points MUST be 0 (user.coins <= 0)
     * 3. Countdown timer must have finished (now >= user.rewardEligibleAt)
     * Result: Points are credited INSTANTLY to user's balance
     */
    static async claimDailyReward(uid, io = null) {
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
                canClaim: false,
                message: 'المستخدم غير موجود'
            };
        }

        // 2. Check if user is banned
        if (user.banned) {
            return {
                success: false,
                status: 'banned',
                canClaim: false,
                message: 'هذا الحساب محظور حالياً'
            };
        }

        // 3. Check if user still has points
        const coins = Number(user.coins || 0);
        if (coins > 0) {
            return {
                success: false,
                status: 'has_points',
                canClaim: false,
                currentCoins: coins,
                message: 'لا يمكنك استرداد المكافأة طالما لديك نقاط متبقية، يجب استنفاد نقاطك أولاً'
            };
        }

        // 4. Check Settings and active Promotion
        const Settings = require('../../models/settings');
        const globalSettings = await Settings.findOne();
        const globalReward = globalSettings?.globalDailyReward !== undefined ? Number(globalSettings.globalDailyReward) : 25;
        const delayMinutes = globalSettings?.rewardDelayMinutes || parseInt(process.env.REWARD_DELAY_MINUTES, 10) || 30;

        const PromotionService = require('./promotionService');
        const activePromo = await PromotionService.getCurrentPromotion();
        const amount = activePromo ? activePromo.rewardValue : globalReward;

        let eligibleAt = user.rewardEligibleAt;
        if (!eligibleAt) {
            eligibleAt = new Date(Date.now() + delayMinutes * 60 * 1000);
            user.rewardEligibleAt = eligibleAt;
            user.zeroBalanceAt = new Date();
            await User.updateOne(
                { _id: user._id },
                { $set: { rewardEligibleAt: eligibleAt, zeroBalanceAt: user.zeroBalanceAt } }
            );
        }

        const now = Date.now();
        const eligibleTime = new Date(eligibleAt).getTime();

        // 5. Check if countdown timer has elapsed
        if (now < eligibleTime) {
            const waitSeconds = Math.max(0, Math.ceil((eligibleTime - now) / 1000));
            return {
                success: false,
                status: 'waiting_timer',
                canClaim: false,
                amount,
                waitSeconds,
                eligibleAt,
                message: `يرجى انتظار انتهاء فترة العداد التنازلي (${Math.ceil(waitSeconds / 60)} دقيقة)`
            };
        }

        // 6. ALL CONDITIONS MET -> INSTANT REWARD CREDIT
        // Atomic balance increment in MongoDB (strictly requiring coins <= 0)
        const updatedUser = await User.findOneAndUpdate(
            { uid: user.uid, coins: { $lte: 0 } },
            {
                $inc: { coins: amount },
                $set: {
                    lastClaimedRewardAt: new Date(),
                    rewardEligibleAt: null,
                    zeroBalanceAt: null
                }
            },
            { new: true }
        );

        if (!updatedUser) {
            return {
                success: false,
                status: 'conflict',
                canClaim: false,
                message: 'حدث تغيير في الرصيد، يرجى إعادة المحاولة'
            };
        }

        console.log(`[RewardService] INSTANT CLAIM SUCCESS: Credited ${amount} points to user ${user.uid}. New balance: ${updatedUser.coins}`);

        // 7. Live Real-Time Socket Event
        if (io) {
            io.to(user.uid).emit('balance_updated', {
                uid: user.uid,
                newBalance: updatedUser.coins,
                added: amount,
                reason: 'daily_reward'
            });
        }

        // 8. Mobile Push Notification via FCM if token exists
        if (updatedUser.fcm) {
            try {
                await admin.messaging().send({
                    token: updatedUser.fcm,
                    notification: {
                        title: 'تم استرداد المكافأة بنجاح! 🎁',
                        body: `تمت إضافة ${amount} نقطة إلى رصيدك. رصيدك الحالي: ${updatedUser.coins}`
                    },
                    data: {
                        type: 'reward_claimed',
                        amount: String(amount),
                        balance: String(updatedUser.coins)
                    }
                });
            } catch (fcmError) {
                console.warn(`[RewardService] FCM notification note for ${user.uid}: ${fcmError.message}`);
            }
        }

        return {
            success: true,
            status: 'claimed',
            canClaim: false,
            amount: amount,
            newBalance: updatedUser.coins,
            coins: updatedUser.coins,
            dollars: updatedUser.dollars,
            message: `تم استرداد ${amount} نقطة بنجاح إلى رصيدك!`
        };
    }

    /**
     * Backward-compatibility stub for any legacy Cron calls
     */
    static async processDueRewards() {
        // No-op: automatic cron reward crediting is deprecated.
        // Rewards are now claimed on-demand by the mobile user after the timer elapses.
    }
}

module.exports = RewardService;
