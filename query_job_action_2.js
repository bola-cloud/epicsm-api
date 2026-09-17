const mongoose = require('mongoose');
const JobActionV2 = require('./v2/models/JobActionV2');

mongoose.connect('mongodb://admin:6DCpv1sgCUVa6g9to26QdFXnr@95.111.244.177:28018/flyker?authSource=admin', { useNewUrlParser: true, useUnifiedTopology: true })
    .then(async () => {
        const action = await JobActionV2.findOne({ jobId: 'Uo50ZWyjMyCiAEKyqz515kPu' });
        console.log("Action status for Sad:", action ? action.status : "NOT FOUND");
        process.exit(0);
    });
