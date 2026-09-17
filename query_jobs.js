const mongoose = require('mongoose');
const JobV2 = require('./v2/models/JobV2');

mongoose.connect('mongodb://admin:6DCpv1sgCUVa6g9to26QdFXnr@95.111.244.177:28018/flyker?authSource=admin', { useNewUrlParser: true, useUnifiedTopology: true })
    .then(async () => {
        const jobs = await JobV2.find({}).sort({ createdAt: -1 }).limit(10);
        jobs.forEach(j => {
            console.log(`JobId: ${j.jobId} | linkTypeName: ${j.linkTypeName} | actionType: ${j.actionType} | likeCount: ${j.likeCount}/${j.maxCount}`);
        });
        process.exit(0);
    });
