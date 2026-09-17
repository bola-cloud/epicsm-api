const mongoose = require('mongoose');
const JobV2 = require('./models/JobV2');
const JobActionV2 = require('./models/JobActionV2');

mongoose.connect('mongodb://127.0.0.1:27017/epicsm')
    .then(async () => {
        console.log("Connected to MongoDB.");
        // Get the last two Facebook jobs created
        const latestJobs = await JobV2.find({ platform: 'facebook' }).sort({ createdAt: -1 }).limit(2);
        
        for (let job of latestJobs) {
            console.log("---");
            console.log(`Job ID: ${job.jobId}`);
            console.log(`Link: ${job.targetLink}`);
            console.log(`Target ID: ${job.target_id}`);
            console.log(`Resolution Status: ${job.resolutionStatus}`);
            
            const actions = await JobActionV2.find({ jobId: job.jobId });
            console.log(`Actions dispatched: ${actions.length}`);
            if (actions.length > 0) {
                 console.log("Actions details:", actions.map(a => ({ userId: a.userId, status: a.status })));
            }
        }
        
        process.exit(0);
    })
    .catch(err => {
        console.error(err);
        process.exit(1);
    });
