const UserSyncService = require('../services/userSyncService');

/**
 * Trigger full migration of all Firebase users to MongoDB
 * Intended for Admin Dashboard use
 */
exports.migrateAllUsers = async (req, res) => {
    try {
        const batchSize = parseInt(req.query.batchSize, 10) || 200;
        console.log(`[MigrationController] Admin requested bulk user migration with batch size: ${batchSize}`);

        const result = await UserSyncService.migrateAllUsers(batchSize);

        return res.status(200).json({
            success: true,
            message: 'تمت هجرة جميع المستخدمين من Firebase إلى MongoDB بنجاح',
            result
        });
    } catch (error) {
        console.error('[MigrationController] Error during migration:', error);
        return res.status(500).json({
            success: false,
            message: 'حدث خطأ أثناء نقل بيانات المستخدمين',
            error: error.message
        });
    }
};

/**
 * Sync or refresh a single user from Firestore to MongoDB
 */
exports.syncSingleUser = async (req, res) => {
    try {
        const { uid } = req.params;
        if (!uid) {
            return res.status(400).json({ success: false, message: 'User ID (uid) is required' });
        }

        const user = await UserSyncService.syncSingleUser(uid);
        if (!user) {
            return res.status(404).json({ success: false, message: 'User not found in Firestore or MongoDB' });
        }

        return res.status(200).json({
            success: true,
            message: 'تمت مزامنة المستخدم بنجاح',
            user
        });
    } catch (error) {
        console.error('[MigrationController] Error syncing single user:', error);
        return res.status(500).json({
            success: false,
            message: 'فشلت مزامنة المستخدم',
            error: error.message
        });
    }
};
