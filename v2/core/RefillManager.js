const cron = require('node-cron');
const JobV2 = require('../models/JobV2');
const InMemoryManager = require('./InMemoryManager');

/**
 * RefillManager
 * 
 * Runs a cron job every minute to check for VIP jobs that haven't reached maxCount.
 * Implements Exponential Backoff Delay to avoid querying the DB for dead jobs every minute.
 */
class RefillManager {
    constructor(jobQueue) {
        this.jobQueue = jobQueue;
        
        // Start the cron job (Runs every minute)
        this.cronTask = cron.schedule('* * * * *', () => {
            this.processRefill();
        });
        console.log("[V2 Refill] Refill Cron Job initialized.");
    }

    /**
     * The main refill loop
     */
    async processRefill() {
        try {
            const activeUsersCount = InMemoryManager.getActiveCount();
            
            // Optimization: If no one is online, don't even query the DB.
            if (activeUsersCount === 0) {
                return;
            }

            const now = new Date();

            // Find VIP jobs that are Active, haven't reached maxCount, 
            // and either have no nextRefillAttempt set, or the time has passed.
            const jobsToRefill = await JobV2.find({
                status: 'Active',
                isVip: true,
                $expr: { $lt: ["$likeCount", "$maxCount"] },
                $or: [
                    { nextRefillAttempt: null },
                    { nextRefillAttempt: { $lte: now } }
                ]
            });

            for (const job of jobsToRefill) {
                // Add to the job queue for processing
                this.jobQueue.addCampaign(job);

                // Update Exponential Backoff for the next attempt
                // Attempts: 1 -> wait 2 mins, 2 -> wait 4 mins, 3 -> wait 8 mins... max 60 mins.
                const attempts = job.refillAttempts + 1;
                const delayMinutes = Math.min(Math.pow(2, attempts), 60);
                
                const nextAttemptDate = new Date(now.getTime() + delayMinutes * 60000);

                await JobV2.updateOne(
                    { _id: job._id },
                    { 
                        refillAttempts: attempts,
                        nextRefillAttempt: nextAttemptDate
                    }
                );
                
                console.log(`[V2 Refill] Scheduled next refill for job ${job.jobId} in ${delayMinutes} minutes.`);
            }

        } catch (error) {
            console.error("[V2 Refill] Error during refill process:", error);
        }
    }
}

module.exports = RefillManager;
