const mongoose = require('mongoose');
const JobActionV2 = require('./v2/models/JobActionV2');
const JobV2 = require('./v2/models/JobV2');

mongoose.connect('mongodb://admin:6DCpv1sgCUVa6g9to26QdFXnr@95.111.244.177:28018/flyker?authSource=admin', { useNewUrlParser: true, useUnifiedTopology: true })
    .then(async () => {
        const actions = await JobActionV2.find({ jobId: 'x6ywnHSnSf224qRbphGameji' });
        console.log("Job Actions length:", actions.length);
        console.log("Job Actions status breakdown:");
        const statuses = actions.reduce((acc, a) => {
            acc[a.status] = (acc[a.status] || 0) + 1;
            return acc;
        }, {});
        console.log(statuses);

        const job = await JobV2.findOne({ jobId: 'x6ywnHSnSf224qRbphGameji' });
        console.log("Job details:", job ? `likeCount: ${job.likeCount}, maxCount: ${job.maxCount}` : 'Not found');
        
        process.exit(0);
    });
