const JobV2 = require('../models/JobV2');
const JobActionV2 = require('../models/JobActionV2');
const InMemoryManager = require('./InMemoryManager');

/**
 * JobQueue
 * 
 * Handles the asynchronous processing of jobs to prevent Event Loop blocking.
 * Uses a micro-delay between jobs to let Node.js breathe and process sockets.
 * Implements Exponential Backoff Throttling if DB gets slow.
 */
class JobQueue {
    constructor(io) {
        this.io = io;
        this.queue = [];
        this.isProcessing = false;
        
        // Base delay between each job processing (in ms)
        this.baseDelay = 50; 
        this.currentDelay = this.baseDelay;
        this.maxDelay = 2000;
    }

    /**
     * Push a new campaign to the queue
     */
    addCampaign(jobData) {
        this.queue.push(jobData);
        if (!this.isProcessing) {
            this.processQueue();
        }
    }

    /**
     * Start processing the queue asynchronously
     */
    async processQueue() {
        if (this.isProcessing) return;
        this.isProcessing = true;

        while (this.queue.length > 0) {
            const job = this.queue.shift();
            
            try {
                const startTime = Date.now();
                
                await this.distributeJob(job);
                
                const duration = Date.now() - startTime;
                
                // Exponential Backoff Throttling: 
                // If DB query took longer than expected (e.g. > 500ms), double the delay.
                // Otherwise, reset to base delay.
                if (duration > 500) {
                    this.currentDelay = Math.min(this.currentDelay * 2, this.maxDelay);
                    console.warn(`[V2 Queue] DB Slowdown detected (${duration}ms). Throttling delay to ${this.currentDelay}ms`);
                } else {
                    this.currentDelay = this.baseDelay;
                }

            } catch (error) {
                console.error("[V2 Queue] Error processing job:", error);
                // Retry later? Or just log. For now, log.
            }

            // Yield the event loop (The Micro-Delay)
            await new Promise(resolve => setTimeout(resolve, this.currentDelay));
        }

        this.isProcessing = false;
    }

    /**
     * Distribute the job to targeted active users
     */
    async distributeJob(job) {
        // Calculate how many users we actually need
        // Remaining = maxCount - likeCount - pending actions
        const pendingCount = await JobActionV2.countDocuments({ jobId: job.jobId, status: 'pending' });
        const remaining = job.maxCount - (job.likeCount + pendingCount);

        if (remaining <= 0) return; // Campaign is full

        // 1. Get excluded users from DB (completed, failed, or pending) for this specific Link, Platform, and Action
        const existingActions = await JobActionV2.find({ 
            targetLink: job.targetLink,
            platform: job.platform,
            actionType: job.actionType
        }).select('userId').lean();
        const excludedUserIds = existingActions.map(action => action.userId);

        // 2. Get Eligible Users using Fair Load Balancing
        const eligibleUsers = InMemoryManager.getEligibleUsers(remaining, excludedUserIds, job.country, job.platform);
        
        if (eligibleUsers.length === 0) {
            // Starvation: No eligible users available right now.
            // Push back to queue or let the Refill Cron handle it later?
            // Refill Cron will handle it to avoid infinite loops in the queue.
            return;
        }

        // 3. Batch DB Insert for the JobActions to 'pending' state
        const actionDocs = eligibleUsers.map(user => ({
            jobId: job.jobId,
            userId: user.userId,
            targetLink: job.targetLink,
            platform: job.platform,
            actionType: job.actionType,
            status: 'pending'
        }));

        await JobActionV2.insertMany(actionDocs, { ordered: false });

        // 4. Dispatch via Socket
        for (const user of eligibleUsers) {
            // Increment their pending jobs tracker
            InMemoryManager.incrementPending(user.userId);
            
            const payload = {
                orders: [{
                    jobId: job.jobId,
                    link: job.targetLink,
                    linkTypeName: job.linkTypeName || job.actionType,
                    likeCount: job.likeCount,
                    maxCount: job.maxCount,
                    isLive: job.isLive !== false, // Default to true if not defined
                    isVip: job.isVip,
                    target_id: job.target_id,
                    mediaId: job.mediaId,
                    userPk: job.userPk,
                    comments: job.comments || []
                }]
            };

            this.io.to(user.socketId).emit('job_assigned', payload);
            console.log(`[Socket.IO] Emitted 'job_assigned' to user ${user.userId}:`, JSON.stringify(payload, null, 2));
        }
        
        console.log(`[V2 Queue] Dispatched job ${job.jobId} to ${eligibleUsers.length} users.`);
    }
}

module.exports = JobQueue;
