const TargetResolver = require('./TargetResolver');
const JobV2 = require('../models/JobV2');
const JobActionV2 = require('../models/JobActionV2');

// Mock Settings Model for Cookies, we'll implement it properly in controllers if it doesn't exist.
const mongoose = require('mongoose');
const AdminCookieSchema = new mongoose.Schema({
    platform: { type: String, unique: true },
    cookieString: String
});
const AdminCookie = mongoose.models.AdminCookie || mongoose.model('AdminCookie', AdminCookieSchema);

class JobWorker {
    constructor(jobQueue) {
        this.jobQueue = jobQueue;
        this.isProcessing = false;
        
        // Start processing loop every 10 seconds
        setInterval(() => this.processPendingJobs(), 10000);
        console.log("[Job Worker] Initialized and watching for pending jobs.");
    }

    async processPendingJobs() {
        if (this.isProcessing) return;
        this.isProcessing = true;

        try {
            // Find jobs that need resolution and are not deleted or completed
            // Status: 'PendingResolution'
            const pendingJobs = await JobV2.find({ isLive: false, _id: { $exists: true } }) // Adjust criteria as needed. Let's say status field
                                            .sort({ createdAt: 1 })
                                            .limit(5);

            // Wait, we need a way to mark jobs that need resolution.
            // Let's add a `resolutionStatus` field to the job schema implicitly or explicitly.
            // But since we can't change the V1 schema easily, we will rely on a new field `resolutionStatus` = 'pending' in V2 jobs
            // Let's modify the query below to match what we will set in the admin controller.
            const jobsToResolve = await JobV2.find({ resolutionStatus: 'pending' }).limit(5);

            for (const job of jobsToResolve) {
                console.log(`[Job Worker] Resolving Target ID for Job: ${job.jobId}`);
                
                try {
                    // Fetch Cookies
                    const cookieDoc = await AdminCookie.findOne({ platform: job.platform });
                    const cookieString = cookieDoc ? cookieDoc.cookieString : '';
                    
                    if (!cookieString) {
                        job.resolutionStatus = 'failed';
                        job.resolutionError = 'No admin cookies found for platform';
                        await job.save();
                        console.error(`[Job Worker] No cookies for ${job.platform}`);
                        continue;
                    }

                    // Resolve
                    const resolvedId = await TargetResolver.resolve(job.platform, job.targetLink, job.actionType, cookieString);
                    
                    if (resolvedId) {
                        // Success!
                        job.resolutionStatus = 'resolved';
                        job.isLive = true;
                        
                        if (job.platform === 'facebook') {
                            job.target_id = resolvedId;
                        } else if (job.platform === 'instagram') {
                            if (job.actionType === 'follow') {
                                job.userPk = resolvedId;
                            } else {
                                job.mediaId = resolvedId;
                            }
                        }
                        
                        await job.save();
                        console.log(`[Job Worker] Successfully resolved ${job.jobId} -> Target ID: ${resolvedId}`);
                        
                        // Push to queue
                        if (this.jobQueue) {
                            this.jobQueue.addCampaign(job);
                        }
                    } else {
                        // Failed to resolve
                        job.resolutionStatus = 'failed';
                        job.resolutionError = 'TargetResolver returned null (Check URL or Cookies)';
                        await job.save();
                        console.error(`[Job Worker] Failed to resolve Target ID for ${job.jobId}`);
                    }
                } catch (error) {
                    job.resolutionStatus = 'failed';
                    job.resolutionError = error.message;
                    await job.save();
                    console.error(`[Job Worker] Error processing job ${job.jobId}:`, error);
                }
            }
        } catch (error) {
            console.error("[Job Worker] Loop error:", error);
        } finally {
            this.isProcessing = false;
        }
    }
}

module.exports = {
    JobWorker,
    AdminCookie
};
