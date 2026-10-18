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

        // 2. Check for active pending reward
        const activePending = await PendingReward.findOne({
            uid: user.uid,
            status: { $in: ['pending', 'processing'] }
        });

        let pendingRewardData = null;
        if (activePending) {
            const waitSeconds = Math.max(0, Math.ceil((new Date(activePending.executeAt).getTime() - Date.now()) / 1000));
            pendingRewardData = {
                id: activePending._id,
                amount: activePending.amount,
                waitSeconds,
                executeAt: activePending.executeAt
            };
        }

        // 3. Check Cooldown (24 hours)
        let canClaimReward = true;
        let cooldownSeconds = 0;

        if (activePending) {
            canClaimReward = false;
        } else if (user.lastClaimedRewardAt) {
            const cooldownHours = 24;
            const cooldownMs = cooldownHours * 60 * 60 * 1000;
            const elapsed = Date.now() - new Date(user.lastClaimedRewardAt).getTime();
            if (elapsed < cooldownMs) {
                canClaimReward = false;
                cooldownSeconds = Math.ceil((cooldownMs - elapsed) / 1000);
            }
        }

        // Check Global Settings and Promotion for uniform reward points
        const Settings = require('../../models/settings');
        const globalSettings = await Settings.findOne();
        const globalReward = globalSettings?.globalDailyReward || 50;

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
                dollars: user.dollars || 0,
                coins: user.coins !== undefined ? user.coins : (user.dollars || 0),
                dailyRewards: effectiveDailyReward,
                isVip: Boolean(user.isVip),
                banned: Boolean(user.banned),
                canClaimReward,
                cooldownSeconds,
                pendingReward: pendingRewardData,
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
 * Non-blocking instant response with delayed processing
 */
exports.mClaimDailyReward = async (req, res) => {
    try {
        const uid = req.body.uid || req.headers['x-user-uid'] || req.query.uid;

        if (!uid) {
            return res.status(400).json({ success: false, message: 'User ID (uid) is required' });
        }

        const result = await RewardService.claimDailyReward(uid);

        if (!result.success) {
            return res.status(result.onCooldown ? 200 : 400).json(result);
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

        // Check for active pending reward
        const activePending = await PendingReward.findOne({
            uid: user.uid,
            status: { $in: ['pending', 'processing'] }
        });

        let pendingRewardData = null;
        if (activePending) {
            const waitSeconds = Math.max(0, Math.ceil((new Date(activePending.executeAt).getTime() - Date.now()) / 1000));
            pendingRewardData = {
                id: activePending._id,
                amount: activePending.amount,
                waitSeconds,
                executeAt: activePending.executeAt
            };
        }

        // Check Cooldown (24 hours)
        let canClaimReward = true;
        let cooldownSeconds = 0;

        if (activePending) {
            canClaimReward = false;
        } else if (user.lastClaimedRewardAt) {
            const cooldownHours = 24;
            const cooldownMs = cooldownHours * 60 * 60 * 1000;
            const elapsed = Date.now() - new Date(user.lastClaimedRewardAt).getTime();
            if (elapsed < cooldownMs) {
                canClaimReward = false;
                cooldownSeconds = Math.ceil((cooldownMs - elapsed) / 1000);
            }
        }

        // Check Global Settings and Promotion for uniform reward points
        const Settings = require('../../models/settings');
        const globalSettings = await Settings.findOne();
        const globalReward = globalSettings?.globalDailyReward || 50;

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
                dollars: user.dollars || 0,
                coins: user.coins !== undefined ? user.coins : (user.dollars || 0),
                dailyRewards: effectiveDailyReward,
                isVip: Boolean(user.isVip),
                banned: Boolean(user.banned),
                canClaimReward,
                cooldownSeconds,
                pendingReward: pendingRewardData,
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

