const cron = require('node-cron');
const JobActionV2 = require('../models/JobActionV2');
const InMemoryManager = require('./InMemoryManager');

class CronTasks {
    static init() {
        // Run every 5 minutes
        cron.schedule('*/5 * * * *', async () => {
            console.log('[V2 Cron] Sweeping Zombie Pending Jobs...');
            await this.sweepZombieJobs();
        });
    }

    /**
     * Sweeps jobs that have been pending for more than 15 minutes.
     * Marks them as 'expired' so the Refill system can redistribute them.
     */
    static async sweepZombieJobs() {
        try {
            // Find 15 minutes ago
            const fifteenMinutesAgo = new Date(Date.now() - 15 * 60 * 1000);

            // Find all pending actions older than 15 minutes
            const zombieActions = await JobActionV2.find({
                status: 'pending',
                createdAt: { $lt: fifteenMinutesAgo }
            }).select('_id userId');

            if (zombieActions.length === 0) {
                return; // Nothing to sweep
            }

            console.log(`[V2 Cron] Found ${zombieActions.length} zombie actions. Expiring them...`);

            // Extract IDs
            const actionIds = zombieActions.map(a => a._id);
            const userIds = zombieActions.map(a => a.userId);

            // Update to expired
            await JobActionV2.updateMany(
                { _id: { $in: actionIds } },
                { $set: { status: 'expired' } }
            );

            // Decrement pending count in InMemoryManager so these users get their slot back
            for (const userId of userIds) {
                InMemoryManager.decrementPending(userId);
            }

            console.log(`[V2 Cron] Zombie sweep complete.`);
        } catch (error) {
            console.error('[V2 Cron] Error sweeping zombie jobs:', error);
        }
    }
}

module.exports = CronTasks;
