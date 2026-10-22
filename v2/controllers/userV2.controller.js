const User = require('../../models/user');
const PendingReward = require('../models/PendingReward');
const UserSyncService = require('../services/userSyncService');
const RewardService = require('../services/rewardService');

/**
 * Mobile V2 Profile Endpoint
 * Returns user profile, current balance, daily rewards config, and reward status
 */
exports.mGetProfile = async (req, res) => {
    try {
        const uid = req.params.uid || req.query.uid || req.headers['x-user-uid'] || (req.body && req.body.uid);

        if (!uid) {
            return res.status(400).json({ success: false, message: 'User ID (uid) is required' });
        }

        // 1. Fetch user from MongoDB, or Lazy Sync if not migrated yet
        let user = await User.findOne({ uid });
        if (!user || !user.migratedToV2) {
            user = await UserSyncService.syncSingleUser(uid);
        }

        if (!user) {
            return res.status(404).json({ success: false, message: 'User not found' });
        }

        // 2. Compute dynamic reward status based on zero-balance and countdown timer
        const rewardInfo = await RewardService.getRewardStatus(user);

        // Check Global Settings and Promotion for uniform reward points
        const Settings = require('../../models/settings');
        const globalSettings = await Settings.findOne();
        const globalReward = globalSettings?.globalDailyReward || 50;
        const pointsPerDollar = globalSettings?.pointsPerDollar || 100;
        const userDollars = user.dollars || 0;
        const dollarsToPointsValue = Math.floor(userDollars * pointsPerDollar);

        const PromotionService = require('../services/promotionService');
        const activePromo = await PromotionService.getCurrentPromotion();
        const effectiveDailyReward = activePromo ? activePromo.rewardValue : globalReward;

        return res.status(200).json({
            success: true,
            user: {
                uid: user.uid,
                email: user.email,
                name: user.name || `${user.prenom || ''} ${user.nom || ''}`.trim(),
                nom: user.nom,
                prenom: user.prenom,
                photo: user.photo,
                dollars: userDollars,
                coins: user.coins !== undefined ? user.coins : 0,
                pointsPerDollar,
                dollarsToPointsValue,
                dailyRewards: effectiveDailyReward,
                isVip: Boolean(user.isVip),
                banned: Boolean(user.banned),

                // Unified and clean reward object for mobile
                reward: {
                    status: rewardInfo.status, // 'has_points' | 'waiting_timer' | 'ready_to_claim'
                    canClaim: rewardInfo.canClaim,
                    rewardAmount: rewardInfo.rewardAmount,
                    waitSeconds: rewardInfo.waitSeconds,
                    eligibleAt: rewardInfo.eligibleAt,
                    message: rewardInfo.message
                },

                // Backwards compatibility fields
                canClaimReward: rewardInfo.canClaim,
                cooldownSeconds: rewardInfo.waitSeconds,
                activePromotion: activePromo ? { active: true, amount: activePromo.rewardValue } : null
            }
        });
    } catch (error) {
        console.error('[UserV2Controller] Error getting profile:', error);
        return res.status(500).json({
            success: false,
            message: 'Failed to fetch user profile',
            error: error.message
        });
    }
};

/**
 * Mobile V2 Claim Daily Reward Endpoint
 * Instant on-demand reward claim when user has 0 points and countdown has elapsed
 */
exports.mClaimDailyReward = async (req, res) => {
    try {
        const uid = req.body.uid || req.headers['x-user-uid'] || req.query.uid;

        if (!uid) {
            return res.status(400).json({ success: false, message: 'User ID (uid) is required' });
        }

        const { getIO } = require('../index');
        const io = getIO ? getIO() : null;

        const result = await RewardService.claimDailyReward(uid, io);

        if (!result.success) {
            if (result.status === 'not_found') {
                return res.status(404).json(result);
            }
            if (result.status === 'banned') {
                return res.status(403).json(result);
            }
            // For status 'has_points' or 'waiting_timer', return 200 with success: false
            return res.status(200).json(result);
        }

        return res.status(200).json(result);
    } catch (error) {
        console.error('[UserV2Controller] Error claiming reward:', error);
        return res.status(500).json({
            success: false,
            message: 'Failed to claim daily reward',
            error: error.message
        });
    }
};

/**
 * Mobile V2 Google Auth Sync Endpoint
 * Called right after Firebase Google Sign-In to register, sync, or update user
 */
exports.mGoogleAuthSync = async (req, res) => {
    try {
        const { uid, email, name, photo, fcm } = req.body;

        if (!uid) {
            return res.status(400).json({ success: false, message: 'User ID (uid) is required' });
        }

        const user = await UserSyncService.syncOrRegisterUser({ uid, email, name, photo, fcm });

        // Compute dynamic reward status based on zero-balance and countdown timer
        const rewardInfo = await RewardService.getRewardStatus(user);

        // Check Global Settings and Promotion for uniform reward points
        const Settings = require('../../models/settings');
        const globalSettings = await Settings.findOne();
        const globalReward = globalSettings?.globalDailyReward || 50;
        const pointsPerDollar = globalSettings?.pointsPerDollar || 100;
        const userDollars = user.dollars || 0;
        const dollarsToPointsValue = Math.floor(userDollars * pointsPerDollar);

        const PromotionService = require('../services/promotionService');
        const activePromo = await PromotionService.getCurrentPromotion();
        const effectiveDailyReward = activePromo ? activePromo.rewardValue : globalReward;

        return res.status(200).json({
            success: true,
            message: 'User authenticated and synchronized successfully',
            user: {
                uid: user.uid,
                email: user.email,
                name: user.name || `${user.prenom || ''} ${user.nom || ''}`.trim(),
                nom: user.nom,
                prenom: user.prenom,
                photo: user.photo,
                dollars: userDollars,
                coins: user.coins !== undefined ? user.coins : 0,
                pointsPerDollar,
                dollarsToPointsValue,
                dailyRewards: effectiveDailyReward,
                isVip: Boolean(user.isVip),
                banned: Boolean(user.banned),

                // Unified and clean reward object for mobile
                reward: {
                    status: rewardInfo.status, // 'has_points' | 'waiting_timer' | 'ready_to_claim'
                    canClaim: rewardInfo.canClaim,
                    rewardAmount: rewardInfo.rewardAmount,
                    waitSeconds: rewardInfo.waitSeconds,
                    eligibleAt: rewardInfo.eligibleAt,
                    message: rewardInfo.message
                },

                // Backwards compatibility fields
                canClaimReward: rewardInfo.canClaim,
                cooldownSeconds: rewardInfo.waitSeconds,
                activePromotion: activePromo ? { active: true, amount: activePromo.rewardValue } : null
            }
        });
    } catch (error) {
        console.error('[UserV2Controller] Error during Google Auth Sync:', error);
        return res.status(500).json({
            success: false,
            message: 'Failed to synchronize Google user',
            error: error.message
        });
    }
};

/**
 * Mobile V2 Update FCM Token Endpoint
 * Called when FirebaseMessaging refreshes or generates a new token
 */
exports.mUpdateFcmToken = async (req, res) => {
    try {
        const { uid, fcm } = req.body;

        if (!uid || !fcm) {
            return res.status(400).json({ success: false, message: 'Both uid and fcm token are required' });
        }

        const user = await User.findOneAndUpdate(
            { uid },
            { $set: { fcm } },
            { new: true }
        );

        if (!user) {
            return res.status(404).json({ success: false, message: 'User not found' });
        }

        return res.status(200).json({
            success: true,
            message: 'FCM token updated successfully'
        });
    } catch (error) {
        console.error('[UserV2Controller] Error updating FCM token:', error);
        return res.status(500).json({
            success: false,
            message: 'Failed to update FCM token',
            error: error.message
        });
    }
};

/**
 * Get current Dollar to Points Exchange Rate
 * GET /api/v4/mobile_v2/exchange-rate
 */
exports.mGetExchangeRate = async (req, res) => {
    try {
        const Settings = require('../../models/settings');
        const globalSettings = await Settings.findOne();
        const pointsPerDollar = globalSettings?.pointsPerDollar || 100;

        return res.status(200).json({
            success: true,
            pointsPerDollar,
            description: `كل 1 دولار يعادل ${pointsPerDollar} نقطة`
        });
    } catch (error) {
        console.error('[UserV2Controller] Error getting exchange rate:', error);
        return res.status(500).json({
            success: false,
            message: 'Failed to fetch exchange rate',
            error: error.message
        });
    }
};

/**
 * Exchange / Convert Dollars into Points (Coins)
 * POST /api/v4/mobile_v2/exchange-dollars
 * Body: { uid: string, amount?: number | 'all' }
 */
exports.mExchangeDollars = async (req, res) => {
    try {
        const uid = req.body?.uid || req.params.uid || req.query.uid || req.headers['x-user-uid'];
        const { amount } = req.body || {};

        if (!uid) {
            return res.status(400).json({ success: false, message: 'User ID (uid) is required' });
        }

        const user = await User.findOne({ uid });
        if (!user) {
            return res.status(404).json({ success: false, message: 'المستخدم غير موجود' });
        }

        const currentDollars = Number(user.dollars) || 0;
        if (currentDollars <= 0) {
            return res.status(400).json({
                success: false,
                message: 'ليس لديك رصيد دولارات كافٍ للفك والتحويل إلى نقاط (رصيدك الحالي 0$)'
            });
        }

        let dollarsToExchange = currentDollars;
        if (amount !== undefined && amount !== null && amount !== 'all') {
            const parsed = Number(amount);
            if (isNaN(parsed) || parsed <= 0) {
                return res.status(400).json({
                    success: false,
                    message: 'يرجى إدخال مبلغ دولار صالح للفك'
                });
            }
            if (parsed > currentDollars) {
                return res.status(400).json({
                    success: false,
                    message: `المبلغ المطلوب ($${parsed}) يتجاوز رصيدك الحالي ($${currentDollars})`
                });
            }
            dollarsToExchange = parsed;
        }

        const Settings = require('../../models/settings');
        const globalSettings = await Settings.findOne();
        const pointsPerDollar = globalSettings?.pointsPerDollar || 100;

        const pointsAwarded = Math.floor(dollarsToExchange * pointsPerDollar);
        if (pointsAwarded <= 0) {
            return res.status(400).json({
                success: false,
                message: 'المبلغ غير كافٍ للحصول على نقاط'
            });
        }

        const updatedUser = await User.findOneAndUpdate(
            { uid },
            {
                $inc: {
                    dollars: -dollarsToExchange,
                    coins: pointsAwarded
                }
            },
            { new: true }
        );

        return res.status(200).json({
            success: true,
            message: `تم فك ${dollarsToExchange}$ بنجاح والحصول على ${pointsAwarded} نقطة!`,
            exchange: {
                dollarsExchanged: dollarsToExchange,
                pointsAwarded,
                pointsPerDollar,
                remainingDollars: updatedUser.dollars,
                totalCoins: updatedUser.coins
            }
        });
    } catch (error) {
        console.error('[UserV2Controller] Error exchanging dollars:', error);
        return res.status(500).json({
            success: false,
            message: 'حدث خطأ أثناء فك رصيد الدولار وتحويله إلى نقاط',
            error: error.message
        });
    }
};

