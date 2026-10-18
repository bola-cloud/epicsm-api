const User = require('../../models/user');
const PendingReward = require('../models/PendingReward');

/**
 * Get all users from MongoDB with pagination, search, and filtering
 */
exports.getUsers = async (req, res) => {
    try {
        const { page = 1, limit = 20, search = '', banned, isVip } = req.query;
        const pageNum = Math.max(1, parseInt(page, 10));
        const pageSize = Math.max(1, parseInt(limit, 10));

        const filter = {};

        if (search.trim()) {
            const term = search.trim();
            const normalized = term.replace(/\s+/g, '').toLowerCase();
            filter.$or = [
                { email: { $regex: term, $options: 'i' } },
                { nameNormalized: { $regex: normalized, $options: 'i' } },
                { nom: { $regex: term, $options: 'i' } },
                { prenom: { $regex: term, $options: 'i' } },
                { uid: term }
            ];
        }

        if (banned !== undefined) {
            filter.banned = banned === 'true';
        }

        if (isVip !== undefined) {
            filter.isVip = isVip === 'true';
        }

        const totalUsers = await User.countDocuments(filter);
        const users = await User.find(filter)
            .sort({ created: -1 })
            .skip((pageNum - 1) * pageSize)
            .limit(pageSize);

        return res.status(200).json({
            success: true,
            users,
            page: pageNum,
            limit: pageSize,
            totalPages: Math.ceil(totalUsers / pageSize),
            totalUsers
        });
    } catch (error) {
        console.error('[AdminUserController] Error fetching users:', error);
        return res.status(500).json({
            success: false,
            message: 'Failed to fetch users',
            error: error.message
        });
    }
};

/**
 * Get single user by Mongo _id or Firebase UID
 */
exports.getUserById = async (req, res) => {
    try {
        const { id } = req.params;
        let user;

        if (id.match(/^[0-9a-fA-F]{24}$/)) {
            user = await User.findById(id);
        }
        if (!user) {
            user = await User.findOne({ uid: id });
        }

        if (!user) {
            return res.status(404).json({ success: false, message: 'User not found' });
        }

        return res.status(200).json({ success: true, user });
    } catch (error) {
        console.error('[AdminUserController] Error fetching user by ID:', error);
        return res.status(500).json({ success: false, message: 'Failed to fetch user', error: error.message });
    }
};

/**
 * Ban or unban user
 */
exports.updateBanStatus = async (req, res) => {
    try {
        const { id } = req.params;
        const { banned } = req.body;

        const isBanned = banned !== undefined ? Boolean(banned) : true;

        const query = id.match(/^[0-9a-fA-F]{24}$/) ? { _id: id } : { uid: id };
        const user = await User.findOneAndUpdate(
            query,
            { $set: { banned: isBanned } },
            { new: true }
        );

        if (!user) {
            return res.status(404).json({ success: false, message: 'User not found' });
        }

        return res.status(200).json({
            success: true,
            message: isBanned ? 'تم حظر المستخدم بنجاح' : 'تم إلغاء حظر المستخدم بنجاح',
            user
        });
    } catch (error) {
        console.error('[AdminUserController] Error updating ban status:', error);
        return res.status(500).json({ success: false, message: 'Failed to update ban status', error: error.message });
    }
};

/**
 * Add, set, or deduct balance (dollars)
 */
exports.updateBalance = async (req, res) => {
    try {
        const { id } = req.params;
        const { amount, operation = 'add' } = req.body;

        const numAmount = Number(amount);
        if (isNaN(numAmount)) {
            return res.status(400).json({ success: false, message: 'Amount must be a valid number' });
        }

        const query = id.match(/^[0-9a-fA-F]{24}$/) ? { _id: id } : { uid: id };
        let update;

        if (operation === 'set') {
            update = { $set: { dollars: Math.max(0, numAmount) } };
        } else if (operation === 'deduct') {
            update = { $inc: { dollars: -Math.abs(numAmount) } };
        } else {
            // Default: 'add'
            update = { $inc: { dollars: Math.abs(numAmount) } };
        }

        const user = await User.findOneAndUpdate(query, update, { new: true });
        if (!user) {
            return res.status(404).json({ success: false, message: 'User not found' });
        }

        return res.status(200).json({
            success: true,
            message: 'تم تحديث الرصيد بنجاح',
            user
        });
    } catch (error) {
        console.error('[AdminUserController] Error updating balance:', error);
        return res.status(500).json({ success: false, message: 'Failed to update balance', error: error.message });
    }
};

/**
 * Set custom dailyReward amount for a user
 */
exports.updateDailyReward = async (req, res) => {
    try {
        const { id } = req.params;
        const { dailyRewards } = req.body;

        const numReward = Number(dailyRewards);
        if (isNaN(numReward) || numReward < 0) {
            return res.status(400).json({ success: false, message: 'dailyRewards must be a positive number' });
        }

        const query = id.match(/^[0-9a-fA-F]{24}$/) ? { _id: id } : { uid: id };
        const user = await User.findOneAndUpdate(
            query,
            { $set: { dailyRewards: numReward } },
            { new: true }
        );

        if (!user) {
            return res.status(404).json({ success: false, message: 'User not found' });
        }

        return res.status(200).json({
            success: true,
            message: 'تم تحديث قيمة المكافأة اليومية للمستخدم بنجاح',
            user
        });
    } catch (error) {
        console.error('[AdminUserController] Error updating daily reward:', error);
        return res.status(500).json({ success: false, message: 'Failed to update daily reward', error: error.message });
    }
};

/**
 * Toggle or update VIP status
 */
exports.updateVipStatus = async (req, res) => {
    try {
        const { id } = req.params;
        const { isVip } = req.body;

        const query = id.match(/^[0-9a-fA-F]{24}$/) ? { _id: id } : { uid: id };
        const user = await User.findOneAndUpdate(
            query,
            { $set: { isVip: Boolean(isVip) } },
            { new: true }
        );

        if (!user) {
            return res.status(404).json({ success: false, message: 'User not found' });
        }

        return res.status(200).json({
            success: true,
            message: 'تم تحديث حالة الـ VIP بنجاح',
            user
        });
    } catch (error) {
        console.error('[AdminUserController] Error updating VIP status:', error);
        return res.status(500).json({ success: false, message: 'Failed to update VIP status', error: error.message });
    }
};

/**
 * View pending rewards in the system
 */
exports.getPendingRewards = async (req, res) => {
    try {
        const { status = 'pending', page = 1, limit = 20 } = req.query;
        const pageNum = Math.max(1, parseInt(page, 10));
        const pageSize = Math.max(1, parseInt(limit, 10));

        const filter = status ? { status } : {};
        const total = await PendingReward.countDocuments(filter);
        const rewards = await PendingReward.find(filter)
            .sort({ executeAt: 1 })
            .skip((pageNum - 1) * pageSize)
            .limit(pageSize);

        return res.status(200).json({
            success: true,
            rewards,
            page: pageNum,
            limit: pageSize,
            totalPages: Math.ceil(total / pageSize),
            total
        });
    } catch (error) {
        console.error('[AdminUserController] Error fetching pending rewards:', error);
        return res.status(500).json({ success: false, message: 'Failed to fetch pending rewards', error: error.message });
    }
};
