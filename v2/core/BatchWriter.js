const JobActionV2 = require('../models/JobActionV2');
const JobV2 = require('../models/JobV2');

class BatchWriter {
    static init() {
        if (this.initialized) return;
        this.buffer = new Map(); // jobId -> Array of userIds
        this.initialized = true;

        // Process buffer every 3 seconds
        setInterval(() => {
            this.processBatch();
        }, 3000);
    }

    /**
     * Add a successful action to the buffer instead of writing immediately
     */
    static addActionSuccess(jobId, userId, reason = '') {
        if (!this.initialized) this.init();

        const key = jobId + "|||" + reason;
        if (!this.buffer.has(key)) {
            this.buffer.set(key, new Set());
        }
        this.buffer.get(key).add(userId);
    }

    /**
     * Process all buffered actions in a single bulk operation
     */
    static async processBatch() {
        if (this.buffer.size === 0) return;

        const currentBuffer = new Map(this.buffer);
        this.buffer.clear(); // Reset immediately to capture new incoming requests

        try {
            for (const [key, usersSet] of currentBuffer.entries()) {
                const parts = key.split("|||");
                const jobId = parts[0];
                const reason = parts[1] || '';
                const userIds = Array.from(usersSet);
                
                // 1. Bulk Update JobActionV2
                await JobActionV2.updateMany(
                    { jobId: jobId, userId: { $in: userIds }, status: 'pending' },
                    { $set: { status: 'completed', reason: reason } }
                );

                // 2. Bulk Update JobV2 (safely with $expr)
                await JobV2.updateMany(
                    { 
                        jobId: jobId,
                        $expr: { $lt: ["$likeCount", "$maxCount"] }
                    },
                    { $inc: { likeCount: userIds.length } }
                );
            }
            // console.log(`[V2 BatchWriter] Processed ${currentBuffer.size} jobs successfully.`);
        } catch (error) {
            console.error('[V2 BatchWriter] Error processing batch:', error);
            // Ideally, we'd requeue failed ones, but for now we log.
        }
    }
}

module.exports = BatchWriter;
