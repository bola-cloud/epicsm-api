const mongoose = require('mongoose');
const JobActionV2 = require('./v2/models/JobActionV2');

mongoose.connect('mongodb://admin:6DCpv1sgCUVa6g9to26QdFXnr@95.111.244.177:28018/flyker?authSource=admin', { useNewUrlParser: true, useUnifiedTopology: true })
    .then(async () => {
        const actions = await JobActionV2.find({ jobId: 'Uo50ZWyjMyCiAEKyqz515kPu' });
        console.log("Actions for Sad:", actions);
        process.exit(0);
    });
