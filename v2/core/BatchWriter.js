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
    static addActionSuccess(jobId, userId) {
        if (!this.initialized) this.init();

        if (!this.buffer.has(jobId)) {
            this.buffer.set(jobId, new Set());
        }
        this.buffer.get(jobId).add(userId);
    }

    /**
     * Process all buffered actions in a single bulk operation
     */
    static async processBatch() {
        if (this.buffer.size === 0) return;

        const currentBuffer = new Map(this.buffer);
        this.buffer.clear(); // Reset immediately to capture new incoming requests

        try {
            for (const [jobId, usersSet] of currentBuffer.entries()) {
                const userIds = Array.from(usersSet);
                
                // 1. Bulk Update JobActionV2
                await JobActionV2.updateMany(
                    { jobId: jobId, userId: { $in: userIds }, status: 'pending' },
                    { $set: { status: 'completed' } }
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
