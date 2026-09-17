const mongoose = require('mongoose');
const JobActionV2 = require('./v2/models/JobActionV2');

mongoose.connect('mongodb://admin:6DCpv1sgCUVa6g9to26QdFXnr@95.111.244.177:28018/flyker?authSource=admin', { useNewUrlParser: true, useUnifiedTopology: true })
    .then(async () => {
        const res = await JobActionV2.updateMany(
            { jobId: 'Uo50ZWyjMyCiAEKyqz515kPu', userId: { $in: ['mejcpkcvJtfOuN4i1gjP5vEg5zz2'] }, status: 'pending' },
            { $set: { status: 'completed' } }
        );
        console.log("Update result:", res);
        process.exit(0);
    });
