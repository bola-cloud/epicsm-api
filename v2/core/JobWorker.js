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
                    let resolvedId = null;
                    let triedAdmin = false;
                    let triedExtraction = false;
                    
                    // 1. Try AdminCookie first
                    const cookieDoc = await AdminCookie.findOne({ platform: job.platform });
                    const adminCookieString = cookieDoc ? cookieDoc.cookieString : '';
                    if (adminCookieString) {
                        triedAdmin = true;
                        console.log(`[Job Worker] Trying AdminCookie for ${job.platform}`);
                        resolvedId = await TargetResolver.resolve(job.platform, job.targetLink, job.actionType, adminCookieString);
                    }
                    
                    // 2. Fallback to ExtractionAccount if AdminCookie failed (or was empty)
                    if (!resolvedId) {
                        const ExtractionAccount = mongoose.models.ExtractionAccount;
                        const User = mongoose.models.User;
                        let extractionCookieString = '';
                        if (ExtractionAccount && User) {
                            const exAcc = await ExtractionAccount.findOne({ platform: job.platform });
                            if (exAcc && exAcc.userId) {
                                const worker = await User.findById(exAcc.userId);
                                if (worker) {
                                    extractionCookieString = job.platform === 'instagram' ? worker.instagramCookies : worker.facebookCookies;
                                }
                            }
                        }
                        if (extractionCookieString) {
                            triedExtraction = true;
                            if (triedAdmin) {
                                console.log(`[Job Worker] AdminCookie failed. Trying ExtractionAccount fallback for ${job.platform}`);
                            } else {
                                console.log(`[Job Worker] Using ExtractionAccount for ${job.platform}`);
                            }
                            resolvedId = await TargetResolver.resolve(job.platform, job.targetLink, job.actionType, extractionCookieString);
                        }
                    }
                    
                    if (!resolvedId) {
                        if (!triedAdmin && !triedExtraction) {
                            job.resolutionStatus = 'failed';
                            job.resolutionError = 'No extraction account or admin cookies found for platform';
                            await job.save();
                            console.error(`[Job Worker] No cookies available for ${job.platform}`);
                            continue;
                        } else {
                            console.error(`[Job Worker] Failed to resolve Target ID for ${job.jobId} (Link: ${job.targetLink}) after trying available cookies. Proceeding with Fallback Mode.`);
                            job.resolutionError = 'TargetResolver returned null for all available cookies - Sent as Fallback Script';
                        }
                    }

                    // Success or Fallback
                    job.resolutionStatus = resolvedId ? 'resolved' : 'fallback';
                    job.isLive = true;
                    
                    if (resolvedId) {
                        if (job.platform === 'facebook') {
                            job.target_id = resolvedId;
                        } else if (job.platform === 'instagram') {
                            if (job.actionType === 'follow') {
                                job.userPk = resolvedId;
                            } else {
                                job.mediaId = resolvedId;
                            }
                        }
                    }
                    
                    await job.save();
                    
                    if (resolvedId) {
                        console.log(`[Job Worker] Successfully resolved ${job.jobId} -> Target ID: ${resolvedId}`);
                    }
                    
                    // Push to queue in BOTH cases
                    if (this.jobQueue) {
                        this.jobQueue.addCampaign(job);
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
