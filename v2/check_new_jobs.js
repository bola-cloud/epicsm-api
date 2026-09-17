const mongoose = require('mongoose');
const JobV2 = require('./models/JobV2');

mongoose.connect('mongodb://127.0.0.1:27017/epicsm')
    .then(async () => {
        const latestJobs = await JobV2.find({ platform: 'facebook' }).sort({ createdAt: -1 }).limit(3);
        for (let job of latestJobs) {
            console.log(`Job: ${job.jobId} | Link: ${job.targetLink} | Target: ${job.target_id} | Status: ${job.resolutionStatus}`);
        }
        process.exit(0);
    });
