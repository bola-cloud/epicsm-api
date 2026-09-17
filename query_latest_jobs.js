const mongoose = require('mongoose');
const JobV2 = require('./v2/models/JobV2');

mongoose.connect('mongodb://admin:6DCpv1sgCUVa6g9to26QdFXnr@95.111.244.177:28018/flyker?authSource=admin', { useNewUrlParser: true, useUnifiedTopology: true })
    .then(async () => {
        const jobs = await JobV2.find({ platform: 'facebook' }).sort({ createdAt: -1 }).limit(10);
        console.log(`\n=== LAST 10 FACEBOOK JOBS ===`);
        for(let job of jobs) {
            console.log(`[Job ID: ${job.jobId}] Type: ${job.linkTypeName}`);
            console.log(`Link: ${job.targetLink}`);
            console.log(`target_id: ${job.target_id}`);
            console.log('---');
        }
        process.exit(0);
    });
