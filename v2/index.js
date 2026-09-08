const JobQueue = require('./core/JobQueue');
const SocketManager = require('./sockets/SocketManager');
const RefillManager = require('./core/RefillManager');
const JobV2 = require('./models/JobV2');

let jobQueue;
let socketManager;
let refillManager;

/**
 * Initialize the entire V2 Architecture
 * @param {Object} server The HTTP/HTTPS server instance
 */
const initV2 = (server) => {
    console.log("[V2 System] Initializing Jobs System V2...");

    // 1. Initialize Job Queue (starts processing asynchronously)
    jobQueue = new JobQueue(null); // io will be attached by SocketManager

    // 2. Initialize Socket.io and attach to server
    socketManager = new SocketManager(server, jobQueue);

    // 3. Initialize Refill Manager Cron Job
    refillManager = new RefillManager(jobQueue);

    // 4. Initialize Zombie Sweep Cron Job
    const CronTasks = require('./core/CronTasks');
    CronTasks.init();

    // 5. Initialize Async Background Job Worker
    const { JobWorker } = require('./core/JobWorker');
    new JobWorker(jobQueue);

    console.log("[V2 System] Initialization Complete. Isolated on path: /v2/socket.io");
};

/**
 * Exposed function to create a new V2 Job (e.g. from Admin Dashboard REST API)
 */
const createNewJobV2 = async (jobData) => {
    try {
        const job = new JobV2(jobData);
        await job.save();

        // Push directly to the async queue for immediate processing
        if (jobQueue) {
            jobQueue.addCampaign(job);
        }

        return job;
    } catch (error) {
        console.error("[V2 System] Error creating job:", error);
        throw error;
    }
};

module.exports = {
    initV2,
    createNewJobV2
};
